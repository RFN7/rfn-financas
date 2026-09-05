# CLAUDE.md — Instruções para o Claude Code

Contexto do projeto **RFN Finanças**. Leia `DOCS.md` (técnico) e `PRD.md` (requisitos) antes de editar. Este arquivo diz **como** trabalhar aqui.

## Objetivo atual
Portar o app (hoje um Artifact da Claude) para rodar **standalone** com:
1. **`db` do artifact → Firebase (Firestore)** para sincronizar Mac ↔ celular.
2. **`sample` do artifact → API de IA própria** para a importação de faturas (texto/foto/PDF).
3. Manter **100% dos requisitos do PRD** e dos invariantes abaixo.

## Marca / estilo (não alterar sem pedir)
- Tema **dark + vermelho neon**; alternância claro/escuro.
- Fontes **Space Grotesk** (texto) + **JetBrains Mono** (números).
- Rodapé com selo de versão. Português do Brasil.

## Invariantes que NÃO podem quebrar (bugs já resolvidos — ver DOCS §9)
1. **Vírgula decimal**: todo campo de dinheiro usa `type="text" inputmode="decimal"` + parser `num()` (aceita `35,50` e `1.234,56`). Nunca `type="number"`.
2. **Editar/excluir são INLINE** (sem modais/overlays): `buildEditPanel` (editor na tela) e `armDelete` (🗑 toque‑duplo). No sandbox, modais falham no toque.
3. **Estado vazio nunca vence dados reais**: `seed().updatedAt = 0`; regras de boot preservam/ restauram dados (ver DOCS §4). Jamais gravar vazio por cima do servidor.
4. **Leitura do banco pelo método certo** (no Firestore, `snapshot.data()`), nunca como propriedade.
5. **Escrita soberana + janela de proteção**: `updatedAt = Math.max(Date.now(), prev+1)`; ignorar updates remotos por ~3s após edição local e enquanto houver edição aberta/gravação pendente. Impede que o sync **reverta** exclusões/edições.
6. **Saneamento antes de renderizar** (`normalize()`): `date` válida, `amount` numérico, `parc>=1`, `desc`/`cat` string. `render()` envolto em try/catch — a tela **nunca** congela.
7. **Salvamento com re‑tentativa** e status visual ("Salvando… / ✓ Salvo").
8. **Importação acumulativa** (dedup) e **detecção de parcelamento** (ver DOCS §5.5) — reimportar não duplica.

## Port: db (Artifact) → Firebase
Substituir `await claude.use('db')` por um adaptador com a MESMA semântica:
- Documento único por usuário: `users/{uid}/ledger/data` (Firestore).
- Login **anônimo** (Firebase Auth) para ter `uid` estável por dispositivo (ou e‑mail, ver PRD §10).
- Manter: `get()` (usar `snap.data()`), `set(state)`, `onSnapshot(next)` com os guards de #5.
- Manter as **regras de boot** (#3) e o **carimbo monotônico** (#5).

## Port: sample (Artifact) → API de IA
Substituir `await claude.use('sample')` por chamada a um endpoint (ex.: **FastAPI no Railway**) que:
- Recebe texto e/ou imagens (base64) e devolve o JSON do **contrato** (DOCS §5.5):
  `{ "itens": [ { "date","desc","amount","type","cat","parc" } ] }`.
- Mantém os lotes de imagens, timeouts, cancelamento e o teto de imagens.
- HEIC continua avisado (converter para JPEG/PNG antes).

## Alerta do dia 5 (fora do artifact)
Recriar como **Cloud Function agendada** (cron mensal, dia 5) + push (FCM), lendo `lastDepositDate` do doc do usuário (ver DOCS §7).

## Como testar (obrigatório antes de publicar)
Use testes de navegador (Playwright) clicando nos **botões reais**, cobrindo:
- Adicionar gasto/ganho com **vírgula**; parcelado; fixo.
- **Editar inline** (salvar com vírgula) e **excluir** (toque‑duplo) — e conferir que **não reverte**.
- Visão por categoria + detalhe; parcelas em aberto; caixinhas (criar/depositar/excluir).
- Sugestões + projeção; importação (mock da IA): cria parcelamento e é **acumulativa**.
- Resiliência: carregar com dados corrompidos (data inválida, desc/cat numéricos) **sem travar**.
- Sync: aparelho vazio **não apaga** o servidor; edição/exclusão **não é revertida** por snapshot atrasado.

Meta: suíte verde antes de qualquer publish. Nunca fazer commit direto na `main` sem os testes passando.

## Convenções
- App de **página única** (Opção A do PRD). Sem framework a menos que se migre para Flutter (Opção B).
- Commits pequenos e descritivos. Não introduzir dependências pesadas sem necessidade.
- Ao mexer em sync/persistência, reler os invariantes #3–#7.
