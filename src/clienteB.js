// Wrapper unico para o Sistema B. Sempre injeta X-Candidato e, em escrita, X-Consulta-Id.
// Nunca lanca excecao por status 4xx/404: devolve {status, json} e quem decide e o chamador
// (ex.: 404 em consulta de documento NAO e erro, significa "cliente nao encontrado").

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Contagem de chamadas ao B por metodo, usada no resumo final.
export const contadoresChamadas = { GET: 0, POST: 0, PUT: 0 };

export async function chamarB(config, metodo, caminho, { query, body, consultaId } = {}) {
  // Respeita "uma requisicao por vez": pausa curta antes de cada chamada ao B.
  if (config.delayEntreRequisicoesMs > 0) await esperar(config.delayEntreRequisicoesMs);

  contadoresChamadas[metodo] = (contadoresChamadas[metodo] ?? 0) + 1;

  const url = new URL(`${config.sistemaB.baseUrl}${caminho}`);
  for (const [chave, valor] of Object.entries(query ?? {})) {
    if (valor !== undefined && valor !== null) url.searchParams.set(chave, valor);
  }

  const headers = { "X-Candidato": config.sistemaB.candidato };
  if (body) headers["Content-Type"] = "application/json";
  if (consultaId) headers["X-Consulta-Id"] = consultaId;

  const resposta = await fetch(url, {
    method: metodo,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(config.timeoutMs),
  });

  const texto = await resposta.text();
  let json = null;
  try {
    json = texto ? JSON.parse(texto) : null;
  } catch {
    // corpo nao-JSON: json fica null
  }

  return { status: resposta.status, json };
}

// Consulta por documento (CPF, 11 digitos). 200 (encontrado) ou 404 (nao encontrado) sao
// ambos respostas validas que trazem consulta_id.
export async function consultarPorDocumento(config, documento) {
  const { status, json } = await chamarB(config, "GET", "/clientes", { query: { documento } });
  if (status !== 200 && status !== 404) {
    throw new Error(`Sistema B respondeu ${status} inesperado na consulta: ${JSON.stringify(json)}`);
  }
  return json; // { encontrado, consulta_id, consulta_expira_em, cliente? }
}

export async function criarCliente(config, payload, consultaId) {
  return chamarB(config, "POST", "/clientes", { body: payload, consultaId });
}

export async function atualizarCliente(config, id, payload, consultaId) {
  return chamarB(config, "PUT", "/clientes", { query: { id }, body: payload, consultaId });
}

export async function listarClientes(config) {
  const { status, json } = await chamarB(config, "GET", "/clientes");
  if (status !== 200) {
    throw new Error(`Sistema B respondeu ${status} inesperado ao listar clientes: ${JSON.stringify(json)}`);
  }
  return json; // { total, data }
}
