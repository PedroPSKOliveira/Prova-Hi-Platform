# sync-a-b

Script de sincronização de cadastros do **Sistema A** (ERP, somente leitura) para o **Sistema B** (CRM).

## Como rodar

```bash
npm install          # nenhuma dependencia externa, so garante o lockfile
cp .env.example .env # preencher CANDIDATO com nome e sobrenome reais
npm test             # testes unitarios dos normalizadores/transformacao (sem rede)

# Simulacao (le o A, transforma, valida e imprime o que seria enviado; NAO toca no B)
node --env-file=.env src/main.js --dry-run
node --env-file=.env src/main.js --dry-run --id 1

# Execucao real (grava no B e fica registrado para avaliacao)
node --env-file=.env src/main.js --id 1 --confirmar   # testar so a pessoa 1 primeiro
node --env-file=.env src/main.js --confirmar          # execucao completa
node --env-file=.env src/main.js --confirmar --limite 5
```

A flag `--confirmar` é uma proteção extra deste projeto: sem `--dry-run`, ela é obrigatória para
que o script grave no Sistema B, evitando execução acidental.

## Estrutura

```
src/
  config.js       # le e valida variaveis de ambiente (falha rapido)
  clienteA.js      # leitura do Sistema A (paginacao, busca por id)
  clienteB.js      # wrapper do Sistema B (headers, consulta, POST, PUT, delay entre chamadas)
  normalizar.js    # normalizadores puros (cpf, data, email, telefone, cep, uf, texto)
  transformar.js   # mapeamento A -> B + validacao (contrato do B)
  comparar.js      # igualdade entre payload e cliente atual (evita PUT sem necessidade)
  sincronizar.js   # fluxo consulta -> decide criar/atualizar -> retentativas
  resumo.js        # contadores e relatorio final (console + out/resumo-*.json)
  log.js           # log linha-a-linha da execucao (out/execucao-*.log)
  main.js          # orquestracao e flags da CLI
tests/
  transformar.test.js  # testes unitarios, sem rede
```

## Decisões tomadas

- **E-mail nulo/vazio/inválido:** registro rejeitado (não chega a chamar o B), motivo detalhado no resumo. Nenhum valor "fake" é inventado.
- **E-mail com maiúsculas/espaços:** normalizado (`trim` + lowercase) antes de validar.
- **CPF:** valida apenas o contrato do B (11 dígitos). Dígito verificador não é checado — o B é quem decide isso; os dados são fictícios.
- **CPF duplicado dentro do próprio A:** a primeira ocorrência é processada normalmente; as demais são registradas como erro de duplicidade, sem chamar o B.
- **Status `INATIVO`:** migrado com `ativo: false` (pessoa não é ignorada).
- **Telefone:** normalizado para E.164 brasileiro (`+55` + DDD + número), aceitando DDI `55` já presente e zero de tronco (`011...`).
- **Idempotência:** antes de qualquer `PUT`, o payload é comparado campo a campo com o cliente atual do B (ignorando `id`, `versao`, `criado_em`, `atualizado_em`); se forem iguais, nada é enviado e o registro conta como "sem alteração".
- **Erros transitórios do B** (`409 CONSULTA_DESATUALIZADA`, `428 CONSULTA_EXPIRADA`, `428 CONSULTA_INVALIDA`, `409 CONSULTA_DIVERGENTE`, `409 CLIENTE_JA_EXISTE` no POST): o script reconsulta e tenta de novo, até `MAX_TENTATIVAS`.
- **Erro de autenticação no B** (`401`): aborta a execução inteira (erro de configuração, não tem sentido continuar).
- **Qualquer outro erro por pessoa:** registrado no resumo e no log; o processamento segue para a próxima pessoa (nunca interrompe o lote).
- **Concorrência:** proibida por especificação. Todo o processamento é sequencial (`for...of` com `await`), e há um pequeno delay configurável entre chamadas ao B.

## Limitações conhecidas

- O delay entre chamadas ao B é fixo (`DELAY_ENTRE_REQUISICOES_MS`), não adaptativo.
- A reconsulta após `CONSULTA_DIVERGENTE`/`CLIENTE_JA_EXISTE` consome uma das `MAX_TENTATIVAS` gerais em vez de ter um contador próprio de "reconsulta única".
