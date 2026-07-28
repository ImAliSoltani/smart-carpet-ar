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
cd backend && uv sync && uv run uvicorn app.main:app --reload

# frontend
cd frontend && npm install && npm run dev
```

Secrets live in `.env` files (see `backend/.env.example`) and are never committed. Heavy data (carpet images, `.glb`/`.usdz`, model weights) stays out of git.
