# سامانه‌ی هوشمند خرید فرش | Smart Carpet Shopping System

خرید فرش با واقعیت افزوده و بینایی ماشین: نمایش فرش روی کف واقعی خانه با **مقیاس واقعی**، جست‌وجوی بصری، پیشنهاد هوشمند چیدمان و اندازه.

AR carpet shopping: true-scale placement on your real floor (WebAR), visual search over the catalog, room-aware recommendations, and smart size matching. Bachelor's final project — Computer Engineering.

## Structure

| Path | What |
|------|------|
| `frontend/` | Next.js + TypeScript PWA (catalog, AR view, admin panel) |
| `backend/` | FastAPI (catalog API, visual search, AR asset pipeline) |
| `infra/` | docker-compose (PostgreSQL + pgvector) |
| `docs/` | proposal & planning documents |

Full plan: [ROADMAP.md](ROADMAP.md)

## Development

```bash
# database
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
