// Cliente HTTP para o Sistema A (ERP, somente leitura).

async function chamarA(config, caminho, query = {}) {
  const url = new URL(`${config.sistemaA.baseUrl}${caminho}`);
  for (const [chave, valor] of Object.entries(query)) {
    if (valor !== undefined && valor !== null) url.searchParams.set(chave, valor);
  }

  const resposta = await fetch(url, {
    method: "GET",
    headers: { "x-api-key": config.sistemaA.apiKey },
    signal: AbortSignal.timeout(config.timeoutMs),
  });

  const texto = await resposta.text();
  let json = null;
  try {
    json = texto ? JSON.parse(texto) : null;
  } catch {
    // corpo nao-JSON: json fica null, chamador decide o que fazer
  }

  return { status: resposta.status, json };
}

function lancarErroA(status, json) {
  const codigo = json?.error?.code ?? "ERRO_DESCONHECIDO";
  const mensagem = json?.error?.message ?? "(sem mensagem)";
  throw new Error(`Sistema A respondeu ${status} ${codigo}: ${mensagem}`);
}

// Busca uma unica pessoa por id. Retorna null se nao encontrada (404).
export async function buscarPessoaPorId(config, id) {
  const { status, json } = await chamarA(config, "/pessoas", { id });
  if (status === 404) return null;
  if (status !== 200) lancarErroA(status, json);
  return json.data;
}

// Le TODAS as pessoas do A, seguindo pagination.next_page at null.
// Nao filtra por status: inativas tambem sao retornadas (viram ativo:false no B).
export async function listarTodasPessoas(config) {
  const pessoas = [];
  let pagina = 1;

  while (pagina !== null) {
    const { status, json } = await chamarA(config, "/pessoas", { page: pagina, page_size: config.pageSize });
    if (status !== 200) lancarErroA(status, json);
    pessoas.push(...json.data);
    pagina = json.pagination.next_page;
  }

  return pessoas;
}
