// Log linha-a-linha da execucao (out/execucao-*.log): horario, id do A, acao e detalhe.

import { mkdir, appendFile } from "node:fs/promises";

export async function criarLogger() {
  await mkdir("out", { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const caminho = `out/execucao-${timestamp}.log`;

  async function registrar(idA, acao, detalhe = "") {
    const linha = `${new Date().toISOString()} | A#${idA} | ${acao}${detalhe ? ` | ${detalhe}` : ""}\n`;
    await appendFile(caminho, linha, "utf8");
  }

  return { caminho, registrar };
}
