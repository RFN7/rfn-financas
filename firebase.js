// firebase.js — Adaptador de nuvem para o RFN Finanças.
// Substitui o `db` do Artifact (claude.use('db')) mantendo A MESMA semântica:
//   const db = await RFN.useDb();
//   const ref  = db.doc('ledger/data');
//   const snap = await ref.get();      // snap.exists (bool) ; snap.data() (função)
//   await ref.set(state);
//   const unsub = ref.onSnapshot(next, error);
//
// Isso significa que o index.html quase não muda: onde hoje ele faz
//   const db = await claude.use('db');
// passa a fazer
//   const db = await RFN.useDb();
// e todo o resto (get/set/onSnapshot/snap.exists/snap.data()) continua igual,
// porque o SDK "compat" do Firestore usa exatamente essa interface.
//
// Requer no <head> do index.html os SDKs compat (ver INTEGRATION.md):
//   firebase-app-compat.js, firebase-auth-compat.js, firebase-firestore-compat.js
//
// IMPORTANTE (invariantes do CLAUDE.md que continuam valendo):
//  - As regras de boot (estado vazio nunca vence dados reais), o carimbo
//    monotônico (updatedAt) e a janela de proteção de ~3s continuam NO index.html.
//    Este arquivo só troca o "cano" de dados; a lógica de merge não muda.

// ── Config do Firebase (é público por design; a segurança vem das regras) ──
// Pegue estes valores no Console do Firebase → Configurações do projeto → Seus apps (Web).
const firebaseConfig = {
  apiKey:            "SUA_API_KEY",
  authDomain:        "SEU_PROJETO.firebaseapp.com",
  projectId:         "SEU_PROJETO",
  storageBucket:     "SEU_PROJETO.appspot.com",
  messagingSenderId: "000000000000",
  appId:             "1:000000000000:web:xxxxxxxxxxxx",
};

let _ready = null;

async function initFirebase() {
  if (_ready) return _ready;
  _ready = (async () => {
    if (typeof firebase === "undefined") {
      throw new Error("SDK do Firebase não carregado — veja INTEGRATION.md (scripts no <head>).");
    }
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

    const auth = firebase.auth();

    // Login ANÔNIMO: dá um uid estável por dispositivo, sem tela de login.
    // (Para sincronizar Mac ↔ celular com garantia, troque por login por e-mail — ver PRD §10.)
    if (!auth.currentUser) {
      await auth.signInAnonymously();
      await new Promise((resolve) => {
        const unsub = auth.onAuthStateChanged((u) => { if (u) { unsub(); resolve(); } });
      });
    }

    const uid = auth.currentUser.uid;
    const fs  = firebase.firestore();

    // Wrapper: o app continua pedindo db.doc('ledger/data'),
    // mas gravamos em users/{uid}/ledger/data (isolado por usuário).
    return {
      uid,
      doc(path) {
        return fs.doc(`users/${uid}/${path}`);
      },
    };
  })();
  return _ready;
}

window.RFN = window.RFN || {};
window.RFN.useDb = initFirebase;
