# سامانه‌ی هوشمند خرید فرش | Smart Carpet Shopping System

خرید فرش با واقعیت افزوده و بینایی ماشین: نمایش فرش روی کف واقعی خانه با **مقیاس واقعی**، جست‌وجوی بصری، پیشنهاد هوشمند چیدمان و اندازه.

AR carpet shopping: true-scale placement on your real floor (WebAR), visual search over the catalog, room-aware recommendations, and smart size matching. Bachelor's final project — Computer Engineering.

## Structure

| Path | What |
|------|------|
| `frontend/` | Next.js + TypeScript PWA (catalog, AR view, admin panel) |
| `backend/` | FastAPI (catalog API, visual search, AR asset pipeline) |
| `infra/` | docker-compose for development; the production stack and Caddy config |
| `notebooks/` | the evaluation chapter's numbers, recomputed from `backend/app/eval` |
| `docs/` | proposal & planning documents |

Full plan: [ROADMAP.md](ROADMAP.md)

## Development

```bash
# database (on Windows the local Postgres lives in WSL: scripts/dev-db.ps1)
docker compose -f infra/docker-compose.yml up -d

# backend (needs uv)
cd backend && uv sync --group ml && uv run --group ml uvicorn app.main:app --reload

# frontend
cd frontend && npm install && npm run dev
```

`--group ml` is torch and timm, and visual search is only real with them. Without
it the app still starts and still answers, on a stand-in backend whose vectors are
orthogonal to the DINOv2 embeddings in the database — so every search returns
nonsense with a 200. It logs a warning when it falls back; the check is:

```bash
cd backend && uv run --group ml python -c "from app.services.embeddings import get_embedding_backend as g; print(type(g()).__name__)"
```

That must print `DinoV2Backend`. If it prints `HashEmbeddingBackend`, reinstall with
`uv sync --group ml --reinstall-package torch` — an interrupted install leaves the
DLLs in place and the Python files missing, which reads as a plain `ImportError`.

Secrets live in `.env` files (see `backend/.env.example`) and are never committed. Heavy data (carpet images, `.glb`/`.usdz`, model weights) stays out of git.

## Tests

```bash
# backend — unit + integration, against a real Postgres
cd backend && uv run pytest

# end to end — starts its own API and a production build of the site,
# on their own ports and their own database (farsh_e2e)
cd frontend && npm run e2e
```

The end-to-end suite needs browsers once: `npx playwright install chromium`. It
never touches the development database, and it seeds its own three-carpet
catalogue (`backend/scripts/seed_e2e.py`) rather than the demo one.

## Evaluation

The numbers in the thesis's evaluation chapter, each recomputable in one command.
`--group ml` is required for the first: the hash fallback would print percentages
that describe nothing.

```bash
cd backend
uv run --group ml python scripts/eval_retrieval.py   # visual search: hit@k, MRR
uv run python scripts/eval_ar.py --sizes             # AR: scale error, success rate
uv run python scripts/eval_sizing.py                 # size guide: A4 scale error
```

The measurement code lives in `backend/app/eval/`; `notebooks/` only calls it and
draws the result, and is committed unexecuted.
