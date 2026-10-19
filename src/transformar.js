// Mapeamento A -> B (secao 7 do PROJETO_SYNC_A_B.md) + validacao dos dados de entrada.
// Funcao pura: nao faz rede, so recebe a Pessoa do A e devolve o payload do B + erros.

import {
  normalizarCpf,
  normalizarData,
  normalizarEmail,
  normalizarTelefone,
  normalizarCep,
  normalizarUf,
  normalizarTexto,
} from "./normalizar.js";

function mapearAtivo(status) {
  if (status === "ATIVO") return true;
  if (status === "INATIVO") return false;
  return null;
}

// Retorna { payload, erros }. Quando erros.length > 0, payload nao deve ser enviado ao B.
export function transformarPessoa(pessoa) {
  const erros = [];
  const endereco = pessoa.endereco ?? {};

  const nome = normalizarTexto(pessoa.nome_completo);
  if (!nome || nome.length < 3) erros.push({ campo: "nome", motivo: "nome_completo vazio ou curto (minimo 3 caracteres)" });

  const documento = normalizarCpf(pessoa.cpf);
  if (!documento) erros.push({ campo: "documento", motivo: `cpf invalido: "${pessoa.cpf}" (esperado 11 digitos)` });

  const nascimento = normalizarData(pessoa.data_nascimento);
  if (!nascimento) erros.push({ campo: "nascimento", motivo: `data_nascimento invalida: "${pessoa.data_nascimento}"` });

  const email = normalizarEmail(pessoa.email);
  if (!email) erros.push({ campo: "contato.email", motivo: `email nulo ou invalido: "${pessoa.email}" (obrigatorio no B)` });

  const telefone = normalizarTelefone(pessoa.telefone);
  if (!telefone) erros.push({ campo: "contato.telefone", motivo: `telefone invalido: "${pessoa.telefone}"` });

  const logradouro = normalizarTexto(endereco.rua);
  if (!logradouro) erros.push({ campo: "endereco.logradouro", motivo: "endereco.rua vazio" });

  const numero = normalizarTexto(endereco.num);
  if (!numero) erros.push({ campo: "endereco.numero", motivo: "endereco.num vazio" });

  const cidade = normalizarTexto(endereco.cidade);
  if (!cidade) erros.push({ campo: "endereco.cidade", motivo: "endereco.cidade vazio" });

  const uf = normalizarUf(endereco.estado);
  if (!uf) erros.push({ campo: "endereco.uf", motivo: `endereco.estado invalido: "${endereco.estado}"` });

  const cep = normalizarCep(endereco.cep);
  if (!cep) erros.push({ campo: "endereco.cep", motivo: `endereco.cep invalido: "${endereco.cep}" (esperado 8 digitos)` });

  const ativo = mapearAtivo(pessoa.status);
  if (ativo === null) erros.push({ campo: "ativo", motivo: `status desconhecido: "${pessoa.status}"` });

  if (erros.length > 0) return { payload: null, erros };

  const payload = {
    nome,
    documento,
    nascimento,
    contato: { email, telefone },
    endereco: { logradouro, numero, cidade, uf, cep },
    ativo,
    origem: { sistema: "A", id_externo: pessoa.id },
  };

  return { payload, erros: [] };
}
