# RFN Finanças

Caderninho pessoal de **Ganhos & Gastos** com IA de leitura de faturas, parcelamentos automáticos, caixinhas de metas e sincronização entre dispositivos.

> Marca **RFN** · estilo dark + vermelho neon · Space Grotesk + JetBrains Mono
> _"Só o conhecimento e o trabalho inteligente tira o pobre da pobreza."_

## Documentos
- **`DOCS.md`** — documentação técnica completa (arquitetura, modelo de dados, funções, contrato da IA, sync).
- **`PRD.md`** — requisitos do produto (features, critérios de aceite, roadmap, stack recomendada).
- **`CLAUDE.md`** — instruções para o Claude Code evoluir o projeto sem quebrar os invariantes.

## Rodar localmente
É um app de página única. Basta abrir o `index.html`:
```bash
# opção 1: abrir direto no navegador
open index.html            # macOS

# opção 2: servidor local (recomendado p/ testar)
python3 -m http.server 8080
# acesse http://localhost:8080
```

> **Modos:** o `index.html` atual foi feito para rodar como **Artifact da Claude** (usa as capacidades `db` e `sample`). Fora do artifact ele **funciona offline** (salva em `localStorage`), mas **sync entre aparelhos** e **IA de importação** só ligam depois de portar para Firebase + uma API de IA (ver `CLAUDE.md` §Port).

## Deploy rápido (estático)
- **GitHub Pages:** suba este repositório e ative *Settings → Pages → branch `main` / root*. URL: `https://rfn7.github.io/rfn-financas/`.
- **Netlify:** `app.netlify.com/drop` e arraste a pasta, ou conecte o repositório.

## Publicar no seu GitHub (RFN7)
```bash
cd rfn-financas
git init -b main
git add .
git commit -m "RFN Finanças: app v8 + DOCS + PRD"
# com GitHub CLI:
gh repo create RFN7/rfn-financas --public --source=. --push
# ou manualmente:
# 1) crie o repo vazio "rfn-financas" em github.com/new
# 2) git remote add origin https://github.com/RFN7/rfn-financas.git
# 3) git push -u origin main
```

## Estrutura
```
rfn-financas/
  index.html     # app (v8) — porta de entrada
  DOCS.md        # documentação técnica
  PRD.md         # requisitos do produto
  CLAUDE.md      # instruções para o Claude Code
  README.md      # este arquivo
  .gitignore
```

## Status
- Versão atual: **v8** (editar/excluir inline; exclusão à prova de sincronização; salvamento robusto).
- Próximo passo: portar `db`→Firebase e `sample`→API própria (ver `CLAUDE.md`).
