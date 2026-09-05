# RFN Finanças — Documentação Técnica

> Caderninho pessoal de **Ganhos & Gastos** (finanças pessoais) — app de página única (SPA), mobile‑first, com IA de leitura de faturas, parcelamentos automáticos, caixinhas de metas e sincronização entre dispositivos.
> Autor: Romero (R9) · Marca: **RFN** · Estilo: dark + vermelho neon, Space Grotesk + JetBrains Mono.

---

## 1. Visão geral

RFN Finanças é um aplicativo de finanças pessoais implementado como **um único arquivo HTML autossuficiente** (`rfn-ganhos-gastos.html`), sem build, sem dependências externas obrigatórias (fontes via Google Fonts; `pdf.js` via CDN só quando importa PDF). Roda como **Artifact da Claude** (com capacidades de runtime `db` e `sample`) ou como **site estático** (GitHub Pages / Netlify), caso em que o sync em nuvem precisa de um backend próprio (ex.: Firebase).

### Principais recursos
- Lançamentos de **ganho** e **gasto**: avulso, **parcelado** (some ao quitar) e **fixo mensal** (recorrente).
- Visualização **por dia** e **por categoria** (cards clicáveis com detalhe).
- **Parcelas em aberto** com alerta de término.
- **Caixinhas** (envelopes de metas: Viagem, Poupança do Noah, etc.).
- **Sugestões** de economia + **projeção de investimento** (juros compostos).
- **Importar** extrato/fatura por **texto, foto/print ou PDF** com IA: classifica, detecta parcelamentos e adiciona de forma **acumulativa (sem duplicar)**.
- **Alerta mensal (dia 5)** in‑app + notificação agendada.
- Tema claro/escuro; **salvamento automático** (local + nuvem) com status "✓ Salvo".

---

## 2. Arquitetura

| Camada | Implementação |
|---|---|
| UI | HTML + CSS (variáveis de tema) + JS vanilla, tudo inline num arquivo |
| Estado | Objeto `state` em memória, espelhado em `localStorage` e no banco do Artifact |
| Persistência local | `localStorage['rfn.ganhos.v1']` |
| Persistência nuvem | Capacidade `db` do Artifact → documento `ledger/data` |
| IA | Capacidade `sample` do Artifact (`sample.json`, imagens) |
| PDF | `pdf.js` (cdnjs) carregado sob demanda |
| Agendamento | Tarefa agendada mensal (dia 5) que lê o `db` e envia lembrete |

Fluxo de renderização: **estado → `render()` → DOM**. Toda mutação chama `persist()` e re‑renderiza. Não há framework; a re‑renderização é manual e idempotente.

### Capacidades declaradas (Artifact)
```json
{ "db": {}, "sample": {} }
```

---

## 3. Modelo de dados

### 3.1 `state`
```ts
interface State {
  theme: 'dark' | 'light';
  entries: Entry[];      // lançamentos
  boxes: Box[];          // caixinhas
  updatedAt: number;     // carimbo monotônico (ms) — soberania de escrita
  lastDepositDate?: string; // 'YYYY-MM-DD' do último depósito em caixinha
}
```

### 3.2 `Entry` (lançamento)
```ts
interface Entry {
  id: string;            // uid()
  type: 'in' | 'out';    // ganho | gasto
  desc: string;          // descrição/estabelecimento
  amount: number;        // ver semântica por tipo abaixo
  date: string;          // 'YYYY-MM-DD'
  parc: number;          // nº de parcelas (>=1)
  cat?: string;          // categoria (texto livre; normalizado p/ string)
  recur?: true;          // fixo mensal
  ex?: true;             // exemplo (semente) — removível
}
```

**Semântica por tipo (é derivada de `parc` + `recur` + `date`):**

| Tipo | Campos | Como aparece nos meses | `amount` significa |
|---|---|---|---|
| Avulso | `parc:1` | só no mês de `date` | valor cheio |
| Parcelado | `parc:N>1` | de `monthKey(date)` até `+N-1` (some depois) | **valor total** (parcela = `amount/parc`) |
| Fixo | `recur:true` | todo mês a partir de `monthKey(date)` | valor cheio por mês |

> `date` de um parcelado é o **mês da 1ª parcela** (firstMonth).

### 3.3 `Box` (caixinha)
```ts
interface Box {
  id: string;
  name: string;
  emoji: string;   // '🐷','✈️',...
  target: number;  // meta (0 = sem meta)
  saved: number;   // guardado
}
```

---

## 4. Persistência e sincronização

- **Local:** `saveLocal()` grava `state` em `localStorage`. `loadLocal()` lê.
- **Nuvem (Artifact `db`):** documento único `db.doc('ledger/data')`. Leitura via `snap.data()`, escrita via `ref.set(state)`.
- **Carimbo monotônico:** `persist()` faz `state.updatedAt = Math.max(Date.now(), (state.updatedAt||0)+1)` → toda escrita local é sempre "mais nova".
- **Janela de proteção:** `onSnapshot` ignora atualizações remotas por **3s** após qualquer escrita local (`lastLocalWrite`) e enquanto houver edição aberta (`editId`) ou escrita pendente (`__dirty`/`__saving`). Evita que um retrato antigo do servidor **desfaça** uma exclusão/edição recém‑feita.
- **Boot (regras anti‑perda de dados):**
  1. Servidor tem dados **e** é igual/mais novo → **adota** servidor.
  2. Servidor vazio mas **local tem dados** → **restaura** (mantém local, marca p/ enviar).
  3. Local vazio, servidor tem → adota servidor.
  4. Primeira vez → cria doc no servidor.
  - Um estado **novo/vazio** nasce com `updatedAt: 0` para **nunca** vencer dados reais (bug histórico que apagava tudo).
- **Saneamento (`normalize()`):** garante `date` válida, `amount` numérico, `parc>=1`, `type`, `desc`/`cat` como string; descarta entradas inválidas. Chamado em todo load/adopt/snapshot. Torna a renderização **à prova de dados corrompidos**.
- **Robustez de escrita (`flushDb()`):** fila com re‑tentativa (a cada 2,5s) em caso de falha; status visual `Salvando… / ✓ Salvo / tentando de novo`. `flushSave()` grava também em `pagehide`/`visibilitychange`.

---

## 5. Referência de funções ("API" interna)

### 5.1 Utilitários
| Função | Descrição |
|---|---|
| `num(v)` | Converte string BR em número: `"35,50"`, `"1.234,56"`, `"35.50"`, `"1234"` → number. |
| `fmt(n)` / `fmts(n)` | Formata em BRL (`fmts` com espaço após `R$`). |
| `fmtk(n)` | Formato curto (`R$1,2k`). |
| `uid()` | id único. |
| `esc(s)` | Escapa HTML (coage p/ string — nunca quebra com número). |
| `monthKey(d)` | `'YYYY-MM'` de uma data (tolerante a inválidos → mês atual). |
| `monthAdd(k,n)` | Soma `n` meses a `'YYYY-MM'` (tolerante). |
| `monthsDiff(a,b)` | Diferença em meses entre dois `'YYYY-MM'`. |
| `monthLabel(k)` | `'Setembro 2026'`. |

### 5.2 Derivados
| Função | Retorno |
|---|---|
| `txMonth(k)` / `sum(arr)` | (base) filtros/soma. |
| `months()` | Lista de `'YYYY-MM'` presentes (inclui spans de parcelados/fixos). |
| `expandMonth(k)` | Itens visíveis no mês `k`: `{e, idx, count, value, date, parcela?, recur?}`. **Coração da lógica de parcelado/fixo.** |
| `parcCount(e)` / `parcValue(e)` / `parcEnd(e)` | nº parcelas / valor da parcela / mês final. |
| `faltaParcelas()` | Total ainda a pagar em parcelamentos (a partir do mês atual). |
| `fixosMensais()` | `{inc, out, has}` dos lançamentos fixos. |
| `depositedThisMonth()` | Se houve depósito em caixinha no mês atual. |
| `fvMonthly(P, taxaAnual, anos)` | Valor futuro de aportes mensais com juros compostos. |

### 5.3 Navegação e render
| Função | Papel |
|---|---|
| `renderTabs()` / `goTab(t)` | Abas: `main` (Lançamentos), `import`, `sugestoes`, `caixinhas`. |
| `render()` | Renderiza a aba Lançamentos (resumo, fixos, parcelas, form, lista). **Envolto em try/catch** (nunca congela). |
| `renderDayList(c, items)` | Lista agrupada por dia; cada item: toque → editor inline; 🗑 → toque‑duplo. |
| `renderCatCards(c, items)` | Cards por categoria (`catEmoji`); clique → `catDetail`. |
| `catDetail(cat)` | Detalhe da categoria (itens editáveis/excluíveis). |
| `renderParcelas(c)` | Seção "Parcelas em aberto" com alerta de término. |
| `renderSugestoes()` | Saldo p/ guardar, onde reduzir, dicas, **projeção de investimento**, plano IA. |
| `renderCaixinhas()` | Lista de caixinhas + total; `boxModal`, `depositModal`. |
| `renderNudge(c)` | Alerta motivacional (dia ≥5 sem depósito). |
| `renderFooter()` | "Apagar tudo" + selo de versão. |

### 5.4 Edição/exclusão (inline — **sem pop-up**)
| Função | Papel |
|---|---|
| `addEntry()` | Adiciona lançamento a partir do formulário (aceita vírgula). |
| `buildEditPanel(e)` | Painel de edição **inline** (aparece na própria tela). Salvar / Cancelar / Excluir. |
| `armDelete(btn, id, beforeDel?)` | Exclusão por **toque‑duplo** (1º arma "Excluir?", 2º apaga). Sem overlay. |
| `boxModal(id?)` / `depositModal(id)` | Criar/editar caixinha; depositar/retirar. |

> **Decisão de design importante:** editar/excluir são **inline** (não modais). No ambiente do Artifact, modais sobrepostos apresentaram falhas de toque; o padrão inline (mesmo do "Adicionar") é confiável.

### 5.5 Importação com IA (`analyze()`)
Fluxo:
1. Coleta `impFiles` (imagens/PDF/CSV/txt) + texto colado.
2. Imagens: envia originais (JPEG/PNG) ou converte (`downscaleImage`); **HEIC é avisado** (não suportado). PDF: rasteriza páginas (`pdfToImages`) ou extrai texto (`extractPdfText`). Timeouts em cada passo (`withTimeout`).
3. Chama `sample.json` (em **lotes** de até `limits().images.maxCount`; barra de progresso + **Cancelar**; teto de 12 imagens/análise).
4. Faz parse dos itens, **dedup acumulativo** e criação de **parcelamentos**.
5. Adiciona automaticamente e mostra resumo (novos / já existentes / parcelamentos) com **Desfazer**.

**Contrato JSON esperado da IA:**
```json
{ "itens": [
  { "date":"AAAA-MM-DD", "desc":"estabelecimento",
    "amount": 123.45, "type":"out", "cat":"Mercado", "parc":"" }
]}
```
- `type`: `"out"` (gasto/pagamento) ou `"in"` (recebimento/estorno).
- `amount`: positivo, ponto decimal; para parcelado é **o valor da parcela do mês**.
- `parc`: `"atual/total"` (ex.: `"02/04"`) quando parcelado; senão `""`.

**Detecção de parcelamento:** de `"02/04"` cria `Entry{ parc:4, date: mêsDaFatura − (2−1), amount: parcela*4 }` → aparece em "Parcelas em aberto" com término correto.

**Dedup acumulativo (chave):**
- Avulso: mesmo `date` + `desc`(normalizado) + `amount` + `type` → ignora.
- Parcelado: mesmo `desc`(normalizado) + nº de parcelas + valor da parcela → ignora (a mesma parcela em faturas diferentes não duplica).

### 5.6 Categorias
Mapa `CATEMOJI` associa nome→emoji (Mercado 🛒, Alimentação 🍔, Transporte 🚗, Combustível ⛽, Farmácia 💊, Saúde 🏋️, Vestuário 👕, Lazer 🎬, Assinatura 📱, Casa 🏠, Educação 📚, Pets 🐶, Presentes 🎁, Compras 🛍️, Salário 💼, Outros 📦…). Categoria é texto livre; sem match usa 📦.

---

## 6. Score / Sugestões / Projeção
- **Sugestões:** saldo do mês, regra dos 20% (quanto guardar), ranking de categorias (onde reduzir), dicas automáticas (poupar primeiro, foco no maior gasto, cortar supérfluos, cuidado com parcelas), botão de **plano personalizado com IA**.
- **Projeção de investimento:** input de aporte mensal + taxa (Poupança 6% / Renda fixa 10% / Ações 12%) → `fvMonthly` mostra valor em 1/5/10/20/30 anos, com investido vs rendimento.

---

## 7. Alerta do dia 5
- **In‑app:** `renderNudge` mostra bolha "Tá esquecendo do seu futuro?" quando é dia ≥5 e não houve depósito no mês.
- **Notificação agendada (fora do app):** tarefa mensal (cron `0 12 5 * *` UTC) que lê `ledger/data`, verifica `lastDepositDate` e envia a mensagem motivacional (ou parabéns se já guardou).

---

## 8. Persistência de chaves e limites
- `localStorage`: `rfn.ganhos.v1`.
- `db`: coleção `ledger`, doc `data` (objeto único ≤256 KiB).
- `sample`: consumo é da conta do usuário; 1ª chamada pede consentimento; imagens conforme `sample.limits()`.

---

## 9. Erros conhecidos já corrigidos (histórico)
1. **Estado vazio sobrescrevia o servidor** (apagava tudo) → `seed().updatedAt=0` + regras de boot.
2. **Leitura de `db` errada** (`doc.data` em vez de `snap.data()`) → sync não funcionava entre Mac/celular.
3. **Vírgula decimal** em `type="number"` zerava o campo → `num()` + `type="text" inputmode="decimal"`.
4. **Modais de editar/excluir** falhavam no Artifact → **edição/exclusão inline**.
5. **Render travava com dado inválido** (data ruim, desc/cat numéricos) → `normalize()` + `esc()` robustos + `try/catch` no render.
6. **Sincronização revertia exclusão** → carimbo monotônico + janela de proteção de 3s.

---

## 10. Como rodar / hospedar
- **Artifact Claude:** publicar com `capabilities:{db:{},sample:{}}` (sync e IA nativos).
- **Estático (GitHub Pages / Netlify):** renomear para `index.html` e subir. Sem `db`/`sample` do Artifact: o sync passa a ser só `localStorage` — para sync entre aparelhos e IA, plugar **Firebase** (auth+Firestore) e uma API de IA.
