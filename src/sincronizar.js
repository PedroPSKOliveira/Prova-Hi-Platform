// Fluxo de escrita no B: consulta -> decide criar/atualizar/nada -> trata retentativas.
// Ver secao 8 (algoritmo) e secao 6 (codigos de erro) do PROJETO_SYNC_A_B.md.

import { consultarPorDocumento, criarCliente, atualizarCliente } from "./clienteB.js";
import { clientesIguais } from "./comparar.js";

// Erros de consulta desatualizada/expirada: a saida e reconsultar e tentar de novo.
function deveReconsultarETentarDeNovo(status, json) {
  const codigo = json?.erro?.codigo;
  if (status === 409 && (codigo === "CONSULTA_DESATUALIZADA" || codigo === "CONSULTA_DIVERGENTE")) return true;
  if (status === 428 && (codigo === "CONSULTA_EXPIRADA" || codigo === "CONSULTA_INVALIDA")) return true;
  return false;
}

// Resultado possivel: { acao: "criado"|"atualizado"|"sem_alteracao", cliente, camposAlterados? }
//                   ou { acao: "erro", motivo, detalhes? }
export async function sincronizarNoB(config, payload) {
  for (let tentativa = 1; tentativa <= config.maxTentativas; tentativa++) {
    const consulta = await consultarPorDocumento(config, payload.documento);

    if (!consulta.encontrado) {
      const resultado = await tentarCriar(config, payload, consulta.consulta_id);
      if (resultado.reconsultar) continue;
      if (resultado) return resultado;
    } else {
      const clienteAtual = consulta.cliente;
      if (clientesIguais(payload, clienteAtual)) {
        return { acao: "sem_alteracao", cliente: clienteAtual };
      }
      const resultado = await tentarAtualizar(config, clienteAtual.id, payload, consulta.consulta_id);
      if (resultado.reconsultar) continue;
      if (resultado) return resultado;
    }
  }

  return { acao: "erro", motivo: "EXCEDEU_TENTATIVAS", detalhes: `sem sucesso apos ${config.maxTentativas} tentativas` };
}

async function tentarCriar(config, payload, consultaId) {
  const { status, json } = await criarCliente(config, payload, consultaId);

  if (status === 201) return { acao: "criado", cliente: json.cliente };
  if (status === 409 && json?.erro?.codigo === "CLIENTE_JA_EXISTE") return { reconsultar: true };
  if (deveReconsultarETentarDeNovo(status, json)) return { reconsultar: true };
  if (status === 422) return { acao: "erro", motivo: "VALIDACAO", detalhes: json?.erro?.detalhes };

  throw new Error(`POST /clientes respondeu ${status} inesperado: ${JSON.stringify(json)}`);
}

async function tentarAtualizar(config, idCliente, payload, consultaId) {
  const { status, json } = await atualizarCliente(config, idCliente, payload, consultaId);

  if (status === 200) {
    return { acao: "atualizado", cliente: json.cliente, camposAlterados: json.campos_alterados ?? [] };
  }
  if (deveReconsultarETentarDeNovo(status, json)) return { reconsultar: true };
  if (status === 422) return { acao: "erro", motivo: "VALIDACAO", detalhes: json?.erro?.detalhes };
  if (status === 404 && json?.erro?.codigo === "CLIENTE_NAO_ENCONTRADO") return { reconsultar: true };

  throw new Error(`PUT /clientes respondeu ${status} inesperado: ${JSON.stringify(json)}`);
}
