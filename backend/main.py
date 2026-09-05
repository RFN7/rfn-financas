# main.py — Backend de IA do RFN Finanças (FastAPI + API da Claude)
#
# Recebe texto e/ou imagens (base64) de uma fatura e devolve o CONTRATO:
#   { "itens": [ {"date":"AAAA-MM-DD","desc":"...","amount":123.45,
#                  "type":"out","cat":"Mercado","parc":"02/04"}, ... ] }
#
# Rodar local:   uvicorn main:app --reload
# Deploy Railway: usa o Procfile (web: uvicorn main:app --host 0.0.0.0 --port $PORT)

import json
import os
from typing import List, Optional

import anthropic
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="RFN Finanças — IA de faturas")

# CORS: libere o domínio do seu front (GitHub Pages) + localhost para testar.
# Defina ALLOWED_ORIGINS no Railway, separado por vírgula.
_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins],
    allow_methods=["*"],
    allow_headers=["*"],
)

# A chave fica SÓ no servidor (variável de ambiente), nunca no navegador.
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

# ID do modelo atual — veja https://docs.claude.com/en/docs/about-claude/models
# e coloque o ID vigente na variável ANTHROPIC_MODEL do Railway.
MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")

SYSTEM = """Você é um extrator de faturas de cartão/contas em português do Brasil.
Leia o texto e/ou as imagens e devolva APENAS um JSON válido, sem comentários, no formato:

{ "itens": [ { "date": "AAAA-MM-DD", "desc": "loja/descrição", "amount": 123.45,
               "type": "out", "cat": "Mercado", "parc": "02/04" } ] }

Regras:
- "type": "out" para gasto, "in" para ganho/estorno.
- "amount": número decimal com PONTO (ex 123.45), valor da parcela do mês (não o total).
- "parc": "atual/total" quando for parcelado (ex "02/04"); string vazia "" quando for à vista.
- "cat": classifique em uma destas: Mercado, Transporte, Restaurante, Assinaturas,
  Saúde, Casa, Lazer, Educação, Compras, Outros.
- "date": use a data da compra/lançamento; se só houver o mês, use o dia 01.
- NÃO invente itens: só o que estiver na fatura. Some nada e não crie totais.
- Responda somente o JSON, começando com { e terminando com }."""


class ImageIn(BaseModel):
    data: str                      # base64 (com ou sem prefixo "data:...")
    media_type: str = "image/jpeg"


class AnalyzeIn(BaseModel):
    prompt: str = ""
    images: List[ImageIn] = []
    modelTier: Optional[str] = "default"


@app.get("/")
def health():
    return {"ok": True, "service": "rfn-financas-ia", "model": MODEL}


@app.post("/analyze")
def analyze(inp: AnalyzeIn):
    if not client.api_key:
        raise HTTPException(500, "ANTHROPIC_API_KEY não configurada no servidor.")

    content = []
    for img in inp.images:
        b64 = img.data.split(",")[-1]  # tolera prefixo "data:image/...;base64,"
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": img.media_type, "data": b64},
        })
    content.append({
        "type": "text",
        "text": inp.prompt or "Extraia os lançamentos desta fatura no formato do contrato.",
    })

    try:
        msg = client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=SYSTEM,
            messages=[{"role": "user", "content": content}],
        )
    except Exception as e:
        raise HTTPException(502, f"Falha ao chamar a IA: {e}")

    text = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")

    # Extrai o bloco JSON da resposta (tolerante a texto em volta).
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end < 0:
        return {"itens": []}
    try:
        return json.loads(text[start:end + 1])
    except json.JSONDecodeError:
        raise HTTPException(502, "A IA não devolveu JSON válido.")
