// Contadores e relatorio final da execucao (secao 12 do PROJETO_SYNC_A_B.md).

import { mkdir, writeFile } from "node:fs/promises";

export function criarResumo() {
  return {
    lidas: 0,
    criados: 0,
    atualizados: 0,
    semAlteracao: 0,
    rejeitados: 0,
    erros: 0,
    chamadasB: { GET: 0, POST: 0, PUT: 0 },
    detalhes: [], // { idA, cpf, tipo: "REJEITADO"|"ERRO", motivo, detalhes? }
    inicio: new Date(),
  };
}

export function registrarResultado(resumo, pessoa, resultado) {
  resumo.lidas += 1;

  if (resultado.tipo === "rejeitado") {
    resumo.rejeitados += 1;
    resumo.detalhes.push({ idA: pessoa.id, cpf: pessoa.cpf, tipo: "REJEITADO", motivo: resultado.erros });
    return;
  }

  if (resultado.tipo === "erro") {
    resumo.erros += 1;
    resumo.detalhes.push({
      idA: pessoa.id,
      cpf: pessoa.cpf,
      tipo: "ERRO",
      motivo: resultado.motivo,
      detalhes: resultado.detalhes,
    });
    return;
  }

  // resultado.tipo === "sincronizado"
  if (resultado.acao === "criado") resumo.criados += 1;
  else if (resultado.acao === "atualizado") resumo.atualizados += 1;
  else if (resultado.acao === "sem_alteracao") resumo.semAlteracao += 1;
}

function formatarDuracao(ms) {
  const totalSegundos = Math.floor(ms / 1000);
  const minutos = String(Math.floor(totalSegundos / 60)).padStart(2, "0");
  const segundos = String(totalSegundos % 60).padStart(2, "0");
  return `${minutos}:${segundos}`;
}

export function textoResumo(resumo) {
  const duracao = formatarDuracao(Date.now() - resumo.inicio.getTime());
  const { GET, POST, PUT } = resumo.chamadasB;

  const linhas = [
    "===== RESUMO =====",
    `Pessoas lidas no A:      ${resumo.lidas}`,
    `Criados:                 ${resumo.criados}`,
    `Atualizados:             ${resumo.atualizados}`,
    `Sem alteracao:           ${resumo.semAlteracao}`,
    `Rejeitados (validacao):  ${resumo.rejeitados}`,
    `Erros (B/rede):          ${resumo.erros}`,
    `Duracao:                 ${duracao}`,
    `Chamadas ao B:           ${GET + POST + PUT}   (GET: ${GET} | POST: ${POST} | PUT: ${PUT})`,
  ];

  if (resumo.detalhes.length > 0) {
    linhas.push("", "Detalhe por registro com problema:");
    for (const d of resumo.detalhes) {
      linhas.push(`- A#${d.idA} | cpf ${d.cpf} | ${d.tipo} | ${JSON.stringify(d.motivo)}`);
    }
  }

  return linhas.join("\n");
}

export async function salvarResumo(resumo) {
  await mkdir("out", { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const caminho = `out/resumo-${timestamp}.json`;
  await writeFile(caminho, JSON.stringify(resumo, null, 2), "utf8");
  return caminho;
}
