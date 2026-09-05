// ai.js — Adaptador de IA para o RFN Finanças.
// Substitui o `sample` do Artifact (claude.use('sample')) mantendo a interface:
//   const sample = await RFN.useSample();
//   const lim = sample.limits();                       // { images: {maxCount, ...} }
//   const res = await sample.json(prompt, {images, signal, modelTier});
//   // res === { itens: [ {date, desc, amount, type, cat, parc}, ... ] }
//
// No index.html, onde hoje é:
//   const sample = await claude.use('sample');
// passa a ser:
//   const sample = await RFN.useSample();
// O resto (analyze(), lotes, timeouts, cancelamento) continua igual.
//
// Este adaptador NÃO fala com a Claude direto do navegador (isso exporia sua
// chave de API). Ele chama o SEU backend FastAPI (pasta backend/), que fala
// com a Claude em segurança e devolve o contrato { itens: [...] }.

// URL do backend depois de publicar no Railway (ex.: https://rfn-financas-ia.up.railway.app)
const AI_ENDPOINT = "https://SEU-BACKEND.up.railway.app";

window.RFN = window.RFN || {};
window.RFN.useSample = async function () {
  return {
    // Limites do lote de imagens (o index.html já respeita isto ao fatiar).
    limits() {
      return {
        images: {
          maxCount: 8,
          maxBytes: 5 * 1024 * 1024, // 5 MB por imagem
          mime: ["image/jpeg", "image/png", "image/webp"],
        },
      };
    },

    // Analisa texto + imagens e devolve o JSON do contrato.
    async json(prompt, opts = {}) {
      const { images = [], signal, modelTier = "default" } = opts;

      // `images` deve chegar como base64 (com ou sem prefixo "data:").
      // Cada item: { data: "<base64>", media_type: "image/jpeg" }.
      // >> Se o seu index.html hoje monta as imagens de outro jeito,
      //    ajuste este map para produzir { data, media_type }.
      const payloadImages = images.map((img) => {
        if (typeof img === "string") return { data: img, media_type: "image/jpeg" };
        return { data: img.data || img.base64 || "", media_type: img.media_type || img.mediaType || "image/jpeg" };
      });

      const r = await fetch(`${AI_ENDPOINT}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt || "", images: payloadImages, modelTier }),
        signal, // permite o Cancelar do app abortar a chamada
      });

      if (!r.ok) {
        const msg = await r.text().catch(() => "");
        throw new Error(`IA ${r.status}: ${msg || r.statusText}`);
      }
      return await r.json(); // { itens: [...] }
    },
  };
};
