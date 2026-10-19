import test from "node:test";
import assert from "node:assert/strict";
import { transformarPessoa } from "../src/transformar.js";
import {
  normalizarCpf,
  normalizarData,
  normalizarEmail,
  normalizarTelefone,
  normalizarCep,
} from "../src/normalizar.js";

function pessoaBase(sobrescrever = {}) {
  return {
    id: 1,
    nome_completo: "Ana Beatriz Souza",
    cpf: "526.018.159-06",
    data_nascimento: "15/03/1990",
    email: "ana.souza@email.com",
    telefone: "(11) 98765-4321",
    status: "ATIVO",
    endereco: {
      rua: "Av. Paulista",
      num: "1000",
      bairro: "Bela Vista",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01310-100",
    },
    atualizado_em: "2026-09-30T10:00:00Z",
    ...sobrescrever,
  };
}

test("transforma uma pessoa valida sem erros", () => {
  const { payload, erros } = transformarPessoa(pessoaBase());
  assert.equal(erros.length, 0);
  assert.equal(payload.documento, "52601815906");
  assert.equal(payload.nascimento, "1990-03-15");
  assert.equal(payload.contato.email, "ana.souza@email.com");
  assert.equal(payload.contato.telefone, "+5511987654321");
  assert.equal(payload.endereco.cep, "01310100");
  assert.equal(payload.endereco.uf, "SP");
  assert.equal(payload.ativo, true);
  assert.deepEqual(payload.origem, { sistema: "A", id_externo: 1 });
});

test("status INATIVO mapeia para ativo: false", () => {
  const { payload, erros } = transformarPessoa(pessoaBase({ status: "INATIVO" }));
  assert.equal(erros.length, 0);
  assert.equal(payload.ativo, false);
});

test("email nulo e rejeitado", () => {
  const { payload, erros } = transformarPessoa(pessoaBase({ email: null }));
  assert.equal(payload, null);
  assert.ok(erros.some((e) => e.campo === "contato.email"));
});

test("email com maiusculas e espacos e normalizado", () => {
  assert.equal(normalizarEmail("  Ana.Souza@EMAIL.com  "), "ana.souza@email.com");
});

test("email invalido (sem @) e rejeitado", () => {
  assert.equal(normalizarEmail("ana.souzaemail.com"), null);
});

test("telefone com DDI 55 e formatado", () => {
  assert.equal(normalizarTelefone("+55 11 98765-4321"), "+5511987654321");
});

test("telefone fixo (10 digitos) e formatado", () => {
  assert.equal(normalizarTelefone("(11) 3456-7890"), "+551134567890");
});

test("telefone com zero de tronco e formatado", () => {
  assert.equal(normalizarTelefone("011 98765-4321"), "+5511987654321");
});

test("telefone com tamanho invalido e rejeitado", () => {
  assert.equal(normalizarTelefone("123456"), null);
});

test("data inexistente (31/02) e rejeitada", () => {
  assert.equal(normalizarData("31/02/1990"), null);
});

test("data valida e convertida para ISO", () => {
  assert.equal(normalizarData("15/03/1990"), "1990-03-15");
});

test("cep sem hifen e normalizado para 8 digitos", () => {
  assert.equal(normalizarCep("01310-100"), "01310100");
});

test("cep com tamanho invalido e rejeitado", () => {
  assert.equal(normalizarCep("123"), null);
});

test("cpf com pontuacao e normalizado para 11 digitos", () => {
  assert.equal(normalizarCpf("526.018.159-06"), "52601815906");
});

test("cpf com tamanho invalido e rejeitado", () => {
  assert.equal(normalizarCpf("123"), null);
});

test("status desconhecido e rejeitado", () => {
  const { payload, erros } = transformarPessoa(pessoaBase({ status: "PENDENTE" }));
  assert.equal(payload, null);
  assert.ok(erros.some((e) => e.campo === "ativo"));
});

test("endereco incompleto acumula erro especifico do campo", () => {
  const { payload, erros } = transformarPessoa(pessoaBase({ endereco: { ...pessoaBase().endereco, cep: "123" } }));
  assert.equal(payload, null);
  assert.ok(erros.some((e) => e.campo === "endereco.cep"));
});
