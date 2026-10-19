// Funcoes puras de normalizacao dos campos "sujos" do Sistema A.
// Cada funcao retorna o valor normalizado ou null quando o dado e invalido/irrecuperavel.

const soDigitos = (v) => String(v ?? "").replace(/\D/g, "");

export function normalizarCpf(cpf) {
  const d = soDigitos(cpf);
  return d.length === 11 ? d : null;
}

export function normalizarData(ddmmaaaa) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(ddmmaaaa ?? "").trim());
  if (!m) return null;
  const [, dd, mm, aaaa] = m;
  // new Date("15/03/1990") nao funciona de forma confiavel: construir com UTC e revalidar.
  const data = new Date(Date.UTC(+aaaa, +mm - 1, +dd));
  const dataExiste =
    data.getUTCFullYear() === +aaaa && data.getUTCMonth() === +mm - 1 && data.getUTCDate() === +dd;
  return dataExiste ? `${aaaa}-${mm}-${dd}` : null;
}

export function normalizarEmail(email) {
  if (email == null) return null;
  const e = String(email).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

export function normalizarTelefone(tel) {
  let d = soDigitos(tel);
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return d.length === 10 || d.length === 11 ? `+55${d}` : null;
}

export function normalizarCep(cep) {
  const d = soDigitos(cep);
  return d.length === 8 ? d : null;
}

export function normalizarUf(uf) {
  const u = String(uf ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(u) ? u : null;
}

export function normalizarTexto(valor) {
  const t = String(valor ?? "").trim().replace(/\s+/g, " ");
  return t.length > 0 ? t : null;
}
