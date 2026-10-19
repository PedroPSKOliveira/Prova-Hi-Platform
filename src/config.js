// Le e valida as variaveis de ambiente. Ponto unico de configuracao do projeto.

function obrigatorio(nome, valor) {
  if (valor === undefined || valor === null || String(valor).trim() === "") {
    throw new Error(`Configuracao invalida: variavel ${nome} e obrigatoria (ver .env.example)`);
  }
  return valor;
}

function inteiro(nome, valor, padrao) {
  if (valor === undefined || valor === "") return padrao;
  const n = Number.parseInt(valor, 10);
  if (Number.isNaN(n)) {
    throw new Error(`Configuracao invalida: variavel ${nome} deve ser um inteiro (recebido "${valor}")`);
  }
  return n;
}

export function carregarConfig(env = process.env) {
  const candidato = obrigatorio("CANDIDATO", env.CANDIDATO).trim();

  // X-Candidato precisa ter nome e sobrenome (2+ palavras), conforme regra do Sistema B.
  const partesNome = candidato.split(/\s+/).filter(Boolean);
  if (partesNome.length < 2) {
    throw new Error(
      `Configuracao invalida: CANDIDATO deve conter nome e sobrenome (recebido "${candidato}")`
    );
  }

  const config = {
    sistemaA: {
      baseUrl: obrigatorio("SISTEMA_A_BASE_URL", env.SISTEMA_A_BASE_URL).replace(/\/+$/, ""),
      apiKey: obrigatorio("SISTEMA_A_API_KEY", env.SISTEMA_A_API_KEY),
    },
    sistemaB: {
      baseUrl: obrigatorio("SISTEMA_B_BASE_URL", env.SISTEMA_B_BASE_URL).replace(/\/+$/, ""),
      candidato,
    },
    pageSize: inteiro("PAGE_SIZE", env.PAGE_SIZE, 5),
    delayEntreRequisicoesMs: inteiro("DELAY_ENTRE_REQUISICOES_MS", env.DELAY_ENTRE_REQUISICOES_MS, 150),
    maxTentativas: inteiro("MAX_TENTATIVAS", env.MAX_TENTATIVAS, 3),
    timeoutMs: inteiro("TIMEOUT_MS", env.TIMEOUT_MS, 15000),
  };

  if (config.pageSize > 5) {
    throw new Error(`Configuracao invalida: PAGE_SIZE maximo aceito pelo Sistema A e 5 (recebido ${config.pageSize})`);
  }

  return config;
}
