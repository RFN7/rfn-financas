# INTEGRATION.md — Ligar Firebase + IA própria no RFN Finanças

Este scaffold troca as duas capacidades do Artifact por infraestrutura sua:
- `claude.use('db')`     → **Firebase (Firestore)**  → `firebase.js`
- `claude.use('sample')` → **backend FastAPI**       → `ai.js` + `backend/`

A interface foi mantida **idêntica**, então o `index.html` muda em pouquíssimos pontos.
Faça na ordem. (Se preferir, entregue este arquivo ao Claude Code e peça pra ele aplicar.)

---

## 1. Firebase (sincronização Mac ↔ celular)

1. Crie um projeto em https://console.firebase.google.com
2. **Authentication → Sign-in method → Anônimo → Ativar.**
3. **Firestore Database → Criar banco** (modo produção).
4. **Firestore → Regras:** cole o conteúdo de `firestore.rules` e publique.
5. **Configurações do projeto → Seus apps → Web (`</>`):** copie o objeto de config
   e cole em `firebase.js` (`const firebaseConfig = {...}`).

### No `index.html` (`<head>`), adicione os SDKs compat + os adaptadores:
```html
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
<script src="firebase.js"></script>
<script src="ai.js"></script>
```

### No JS do app, troque a origem do `db`:
```js
// ANTES (artifact):
const db = await claude.use('db');
// DEPOIS:
const db = await RFN.useDb();
```
O resto continua igual: `db.doc('ledger/data')`, `ref.get()`, `snap.exists`,
`snap.data()`, `ref.set(state)`, `ref.onSnapshot(next, error)`.

> **Não mexa** nos invariantes de sync (CLAUDE.md #3–#7): regras de boot,
> carimbo monotônico `updatedAt` e janela de proteção de ~3s ficam no `index.html`.
> O adaptador só troca o cano; a lógica de merge é a mesma.

---

## 2. Backend de IA (importação de faturas)

1. `cd backend`
2. Local: `pip install -r requirements.txt` e `uvicorn main:app --reload`
   (teste em http://127.0.0.1:8000/ → deve responder `{"ok": true}`).
3. Deploy no **Railway**:
   - Novo projeto → Deploy from GitHub → aponte para a pasta `backend/`.
   - Em **Variables**, copie de `backend/.env.example`:
     `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ALLOWED_ORIGINS`.
   - O `Procfile` já sobe com `uvicorn`.
4. Pegue a URL pública (ex.: `https://rfn-financas-ia.up.railway.app`)
   e cole em `ai.js` (`const AI_ENDPOINT = ...`).

### No JS do app, troque a origem do `sample`:
```js
// ANTES:
const sample = await claude.use('sample');
// DEPOIS:
const sample = await RFN.useSample();
```
`sample.limits()` e `sample.json(prompt, {images, signal, modelTier})` continuam iguais,
e a resposta é o mesmo contrato `{ itens: [...] }` (DOCS §5.5).

> **Imagens:** o `ai.js` espera cada imagem como `{ data: "<base64>", media_type: "image/jpeg" }`.
> Se o seu `analyze()` monta as imagens de outro jeito, ajuste o `.map()` dentro de `ai.js`.
> HEIC do iPhone continua precisando virar JPEG/PNG antes (aviso já existe no app).

---

## 3. Alerta do dia 5 (opcional, depois)

No artifact era uma tarefa agendada. Fora dele, recrie como **Cloud Function agendada**
(cron mensal, dia 5) + push (FCM), lendo `lastDepositDate` do doc do usuário. Ver DOCS §7.

---

## 4. Testar antes de publicar (CLAUDE.md)

Rode a suíte de sempre (Playwright nos botões reais): adicionar com vírgula, parcelado,
fixo, editar inline, excluir (toque-duplo, sem reverter), categorias, parcelas em aberto,
caixinhas, sugestões/projeção, importação (cria parcelamento e é acumulativa) e
resiliência a dados corrompidos. Só suba com a suíte verde.

---

## Resumo do que muda no index.html
- `+` 5 `<script>` no `<head>` (Firebase compat + firebase.js + ai.js).
- `claude.use('db')`     → `RFN.useDb()`
- `claude.use('sample')` → `RFN.useSample()`
- Nada mais. Toda a lógica de estado, render, sync e importação permanece.
