# PRD — RFN Finanças (Caderninho de Ganhos & Gastos)

- **Produto:** RFN Finanças — controle pessoal de finanças com IA de leitura de faturas.
- **Dono:** Romero (R9) — marca RFN.
- **Versão do doc:** 1.0 · **Data:** 2026‑09‑05 · **Base:** app atual v8 (artifact).
- **Objetivo deste PRD:** servir de fonte única para reconstruir/evoluir o app no **Claude Code**.

---

## 1. Visão e problema

**Problema:** controlar ganhos e gastos no dia a dia é trabalhoso; digitar tudo manualmente desanima, faturas de cartão são confusas (parcelamentos, muitas linhas) e falta uma visão clara de "quanto sobra pra guardar".

**Visão:** um caderninho **simples e rápido** onde o usuário anota (ou fotografa a fatura e a IA lança sozinha), vê para onde vai o dinheiro por categoria, acompanha parcelas até quitar, separa dinheiro em "caixinhas" de metas e é incentivado a poupar — tudo salvo automaticamente e sincronizado entre celular e computador.

**Métrica de sucesso:** o usuário consegue registrar um mês inteiro em < 5 min (via importação), enxergar o saldo do mês na hora e manter o hábito de guardar (uso do alerta do dia 5 + caixinhas).

---

## 2. Público‑alvo (persona)
- **Romero**, 30+, autodidata em tecnologia, usa **celular (iPhone) e Mac**, digita valores em **padrão brasileiro (vírgula)**, quer praticidade e visão de investimento/poupança. Usa faturas de cartão com **parcelamentos**.

---

## 3. Escopo

### Dentro (MVP → atual)
Lançamentos (avulso/parcelado/fixo), categorias, parcelas em aberto, caixinhas, sugestões + projeção, importação por IA (texto/foto/PDF, acumulativa), alerta dia 5, tema claro/escuro, salvamento automático e sync.

### Fora (por ora)
Multiusuário/compartilhado, orçamento por categoria com limites rígidos, integração bancária (Open Finance), relatórios PDF exportáveis, metas de investimento com aportes automáticos.

---

## 4. Requisitos funcionais (com histórias e critérios de aceite)

### F1 — Lançar ganho/gasto
*Como usuário, quero adicionar um ganho ou gasto rapidamente.*
- Campos: tipo (ganho/gasto), descrição, **valor (aceita vírgula)**, data.
- **AC:** valor "35,50" é aceito; ao salvar, aparece no mês da data; resultado (Ganhos/Gastos/Saldo) atualiza **na hora**; mostra "✓ Salvo".

### F2 — Gasto parcelado
*Como usuário, quero dividir uma compra em N parcelas que somem ao quitar.*
- Informar valor total + nº de parcelas + mês inicial.
- **AC:** aparece 1 parcela por mês (valor total/N), com badge `x/N`; some após a última; consta em "Parcelas em aberto" com o mês de término.

### F3 — Fixo mensal
*Como usuário, quero um ganho/gasto que se repete todo mês (salário, aluguel).*
- **AC:** marca "🔁 Fixo"; aparece automaticamente em todos os meses a partir do início; faixa "Fixos todo mês" soma entradas/saídas fixas.

### F4 — Editar e excluir (inline, sem pop‑up)
*Como usuário, quero editar ou excluir qualquer lançamento facilmente.*
- Tocar no item → **editor inline** na tela; 🗑 → **toque‑duplo** ("Excluir?" → confirma).
- **AC:** editar valor com vírgula salva; excluir remove o item e **não volta** (à prova de sincronização); totais recalculam automaticamente.

### F5 — Visão por categoria e por dia
- Alternância **Categorias / Por dia**; cards por categoria com total e clique para detalhe (itens editáveis/excluíveis).
- **AC:** cada card mostra emoji + total + nº de lançamentos; detalhe lista as compras da categoria no mês.

### F6 — Parcelas em aberto
- Seção fixa com cada parcelamento: `x/N`, valor/mês, **quando termina** e alerta ("última parcela este mês", "termina mês que vem").
- **AC:** valores batem com a fatura; total "falta pagar" correto.

### F7 — Caixinhas (metas)
- Criar caixinha (nome, ícone, meta, guardado); depositar/retirar; barra de progresso; total guardado.
- **AC:** depósito atualiza guardado e registra `lastDepositDate`.

### F8 — Sugestões + projeção de investimento
- Saldo p/ guardar (regra 20%), onde reduzir (ranking de categorias), dicas automáticas, **plano IA**.
- Projeção: aporte mensal + taxa → valor em 1/5/10/20/30 anos (juros compostos), investido vs rendimento.
- **AC:** R$500/mês a 10% ≈ R$102.422 em 10 anos.

### F9 — Importar por IA (texto/foto/PDF)
*Como usuário, quero fotografar/anexar a fatura e a IA lançar tudo classificado.*
- Aceita **uma ou várias** imagens/PDFs + texto colado; analisa em lotes; barra de progresso + Cancelar.
- **Detecta parcelamentos** (cria o parcelamento correto).
- **Acumulativo:** compara com o existente e **só acrescenta o novo** (fatura no começo/meio/fim do mês não duplica).
- Adição automática + resumo (novos / já existentes / parcelamentos) + **Desfazer**.
- **AC:** reimportar a mesma fatura → 0 novos; nova fatura → só o que faltava; HEIC do iPhone é avisado (usar print/JPEG).

### F10 — Alerta do dia 5
- In‑app (bolha motivacional) + notificação agendada mensal se não houve depósito no mês.
- **AC:** mensagem tom "Tá esquecendo do seu futuro… valorize seu dinheiro".

### F11 — Salvamento e sincronização
- Salva a cada edição (local + nuvem); status visual; sincroniza entre Mac e celular; **nunca apaga dados por engano**; exclusão/edição **não é revertida** por sync atrasado.
- **AC:** editar no celular reflete no Mac ao abrir; abrir num aparelho vazio não zera o outro.

### F12 — Tema
- Claro/escuro, escolha salva; identidade RFN (dark + vermelho neon).

---

## 5. Requisitos não‑funcionais
- **Mobile‑first**, toque confiável (evitar overlays/modais frágeis — preferir inline).
- **pt‑BR:** vírgula decimal em todos os campos monetários.
- **Offline‑first:** funciona sem rede (localStorage); nuvem é reforço.
- **Resiliência:** dados corrompidos não podem travar a tela (saneamento + render tolerante).
- **Confiabilidade de escrita:** re‑tentativa em falha; carimbo monotônico; janela de proteção pós‑edição.
- **Desempenho:** render instantâneo para centenas de lançamentos/mês.
- **Privacidade:** dados financeiros ficam na conta do usuário (privado); nada público.

---

## 6. Modelo de dados (resumo)
Ver DOCS §3. Núcleo:
- `Entry{ id, type, desc, amount, date, parc, cat?, recur?, ex? }` — parcelado/fixo derivados de `parc`/`recur`/`date`.
- `Box{ id, name, emoji, target, saved }`.
- `State{ theme, entries[], boxes[], updatedAt, lastDepositDate? }`.

Contrato da IA (importação): ver DOCS §5.5.

---

## 7. Recomendação de stack para o Claude Code

Duas opções (escolher conforme objetivo):

### Opção A — Manter SPA HTML (rápido de evoluir)
- 1 arquivo `index.html` (vanilla JS) — como hoje.
- Sync: **Firebase** (Auth anônima + Firestore doc por usuário) no lugar do `db` do Artifact.
- IA: endpoint próprio (**FastAPI** no Railway) chamando um modelo multimodal, ou a API da Claude.
- Deploy: **GitHub Pages** (RFN7) ou **Netlify**.
- Prós: reaproveita 100% do código atual; simples. Contras: menos estrutura para crescer.

### Opção B — Reescrever em Flutter + Firebase (stack do Romero)
- **Flutter** (mobile + web), **Firebase** (Auth, Firestore, Cloud Functions), IA via Function → modelo multimodal.
- Prós: app nativo, sync robusto, escalável. Contras: mais esforço inicial.

> **Sugestão:** começar pela **Opção A** (portar o HTML atual para Firebase e hospedar), validar em produção, e migrar para **Opção B** se for evoluir para produto.

### Estrutura sugerida (Opção A, no Claude Code)
```
rfn-financas/
  index.html            # app (portar do artifact)
  /assets               # ícones, manifest PWA
  firebase.js           # init + doc read/write (substitui db do artifact)
  ai.js                 # chamada à API de IA (substitui sample)
  README.md
  DOCS.md  (este)       # documentação técnica
  PRD.md   (este)
```
Pontos de troca ao portar:
- `claude.use('db')` → Firestore (`onSnapshot`, `set`, `get`) com as **mesmas regras de merge/monotônico/janela de proteção**.
- `claude.use('sample')` → chamada à API (enviar texto/imagens; receber o JSON `{itens:[...]}` do contrato).
- Tarefa do dia 5 → **Cloud Function** agendada (Pub/Sub cron) + FCM push.

---

## 8. Roadmap sugerido
1. **v1 (portar):** HTML atual + Firebase (sync) + hospedagem. Login anônimo por dispositivo.
2. **v2:** IA de fatura via backend próprio; PWA instalável (ícone na tela inicial).
3. **v3:** orçamento por categoria com metas/limites e alertas; exportar relatório (PDF/planilha).
4. **v4 (se virar produto):** Flutter + multiusuário + Open Finance.

---

## 9. Lições aprendidas (evitar reincidência)
- **Nunca** deixar estado vazio/novo vencer dados existentes (usar `updatedAt:0` p/ seed + regras de boot).
- Ler o banco pelo **método correto** (`snap.data()`), não como propriedade.
- **Vírgula** decimal desde o dia 1 (`type="text" inputmode="decimal"` + parser).
- Preferir **UI inline** a modais/overlays no ambiente sandbox.
- **Sanear** toda entrada antes de renderizar e envolver render em try/catch.
- Escritas locais **soberanas** (carimbo monotônico) + **janela de proteção** para o sync não reverter ações.

---

## 10. Perguntas em aberto
- Login: anônimo por dispositivo, ou conta (e‑mail) para sync multi‑device garantido?
- IA: usar API da Claude ou modelo próprio no Railway? Orçamento por análise?
- Categorias: manter texto livre ou fixar um conjunto (com orçamento por categoria)?
- Multiusuário (Romero + Fernanda) no mesmo caderno, ou cadernos separados?
