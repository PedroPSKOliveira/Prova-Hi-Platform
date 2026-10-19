// Compara o payload que seria enviado com o cliente atual do B, considerando
// apenas os campos do contrato (secao 8: "Comparacao para evitar PUT").

const CAMPOS_COMPARAVEIS = [
  "nome",
  "documento",
  "nascimento",
  "contato.email",
  "contato.telefone",
  "endereco.logradouro",
  "endereco.numero",
  "endereco.cidade",
  "endereco.uf",
  "endereco.cep",
  "ativo",
  "origem.sistema",
  "origem.id_externo",
];

function lerCaminho(objeto, caminho) {
  return caminho.split(".").reduce((valor, chave) => valor?.[chave], objeto);
}

// Normaliza para comparacao: numero vs string (ex.: origem.id_externo) nao deve contar como diferenca.
function normalizarParaComparacao(valor) {
  if (valor === undefined || valor === null) return null;
  return typeof valor === "number" ? String(valor) : valor;
}

export function clientesIguais(payload, clienteAtual) {
  return CAMPOS_COMPARAVEIS.every((campo) => {
    const a = normalizarParaComparacao(lerCaminho(payload, campo));
    const b = normalizarParaComparacao(lerCaminho(clienteAtual, campo));
    return a === b;
  });
}
