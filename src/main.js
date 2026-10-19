// Orquestracao do script de sincronizacao A -> B.
// Flags: --dry-run | --id N | --limite N | --confirmar (obrigatoria p/ gravar no B sem --dry-run)

import { carregarConfig } from "./config.js";
import { listarTodasPessoas, buscarPessoaPorId } from "./clienteA.js";
import { transformarPessoa } from "./transformar.js";
import { sincronizarNoB } from "./sincronizar.js";
import { contadoresChamadas } from "./clienteB.js";
import { criarResumo, registrarResultado, textoResumo, salvarResumo } from "./resumo.js";
import { criarLogger } from "./log.js";

function lerFlags(argv) {
  const flags = { dryRun: false, id: null, limite: null, confirmar: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--confirmar") flags.confirmar = true;
    else if (arg === "--id") flags.id = Number.parseInt(argv[++i], 10);
    else if (arg === "--limite") flags.limite = Number.parseInt(argv[++i], 10);
    else throw new Error(`Flag desconhecida: ${arg}`);
  }
  return flags;
}

// Erro de configuracao/autenticacao no B: nao tem sentido continuar tentando as proximas pessoas.
function ehErroFatalDeAutenticacao(erro) {
  return /respondeu 401/.test(erro.message);
}

async function obterPessoas(config, flags) {
  if (flags.id !== null) {
    const pessoa = await buscarPessoaPorId(config, flags.id);
    return pessoa ? [pessoa] : [];
  }
  const pessoas = await listarTodasPessoas(config);
  return flags.limite !== null ? pessoas.slice(0, flags.limite) : pessoas;
}

async function processarPessoa(config, pessoa, flags, cpfsJaProcessados) {
  const { payload, erros } = transformarPessoa(pessoa);

  if (erros.length > 0) {
    return { tipo: "rejeitado", erros };
  }

  // CPF duplicado dentro do proprio A: processa o primeiro, registra os demais como erro.
  if (cpfsJaProcessados.has(payload.documento)) {
    return { tipo: "erro", motivo: "CPF_DUPLICADO_NO_A", detalhes: `documento ${payload.documento} ja processado nesta execucao` };
  }
  cpfsJaProcessados.add(payload.documento);

  if (flags.dryRun) {
    console.log(`[dry-run] A#${pessoa.id} seria enviado ao B:`, JSON.stringify(payload));
    return { tipo: "sincronizado", acao: "dry_run" };
  }

  const resultado = await sincronizarNoB(config, payload);
  if (resultado.acao === "erro") {
    return { tipo: "erro", motivo: resultado.motivo, detalhes: resultado.detalhes };
  }
  console.log(`A#${pessoa.id} -> ${resultado.acao}${resultado.cliente ? ` (B: ${resultado.cliente.id})` : ""}`);
  return { tipo: "sincronizado", acao: resultado.acao };
}

async function main() {
  const flags = lerFlags(process.argv.slice(2));
  const config = carregarConfig();

  if (!flags.dryRun && !flags.confirmar) {
    console.error(
      "Execucao sem --dry-run requer --confirmar (grava no Sistema B e fica registrado). " +
        "Use --dry-run para simular, ou --confirmar para gravar de fato."
    );
    process.exitCode = 1;
    return;
  }

  const pessoas = await obterPessoas(config, flags);
  const resumo = criarResumo();
  const cpfsJaProcessados = new Set();
  const logger = await criarLogger();

  for (const pessoa of pessoas) {
    try {
      const resultado = await processarPessoa(config, pessoa, flags, cpfsJaProcessados);
      registrarResultado(resumo, pessoa, resultado);
      await logger.registrar(pessoa.id, resultado.tipo, resultado.acao ?? JSON.stringify(resultado.motivo ?? resultado.erros));
    } catch (erro) {
      if (ehErroFatalDeAutenticacao(erro)) {
        console.error(`Erro fatal de autenticacao no Sistema B, abortando execucao: ${erro.message}`);
        await logger.registrar(pessoa.id, "ERRO_FATAL", erro.message);
        break;
      }
      registrarResultado(resumo, pessoa, { tipo: "erro", motivo: "EXCECAO", detalhes: erro.message });
      await logger.registrar(pessoa.id, "erro", erro.message);
    }
  }

  resumo.chamadasB = { ...contadoresChamadas };
  console.log("\n" + textoResumo(resumo));

  const caminho = await salvarResumo(resumo);
  console.log(`\nResumo salvo em: ${caminho}`);
  console.log(`Log de execucao salvo em: ${logger.caminho}`);
}

main().catch((erro) => {
  console.error(`Erro fatal: ${erro.message}`);
  process.exitCode = 1;
});
