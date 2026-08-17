# 続く Tsuzuku

Self-hosted, personal manga reader. Tachiyomi-style flow (search → library →
chapters → reader), backed by a FastAPI service that centralizes scraping
via [Scrapling](https://github.com/D4Vinci/Scrapling) instead of per-device
extensions.

**Personal use only** — not for public distribution or app store submission.

See [`CLAUDE.md`](./CLAUDE.md) for architecture, the source interface
contract, design system, and roadmap.

## Layout

- `backend/` — FastAPI service (source-agnostic REST API, Redis cache, Scrapling source modules)
- `app/` — Expo (React Native) client

## Getting started

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in REDIS_URL, SUPABASE_URL, SUPABASE_KEY
uvicorn app.main:app --reload
```

### App

```bash
cd app
npm install
npx expo start
```
