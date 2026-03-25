# Stockwise

Stockwise is a React + Vite stock dashboard with a lightweight FastAPI backend powered by Yahoo Finance.

## Repo Structure

- `src/` — frontend app
- `api/index.py` — FastAPI backend
- `requirements.txt` — Python backend dependencies

## Local Development

Run the backend:

```bash
cd /Users/florah/Desktop/stockwise
npm run dev:api
```

Run the frontend in a second terminal:

```bash
cd /Users/florah/Desktop/stockwise
npm run dev
```

The Vite dev server proxies `/api/*` to `http://127.0.0.1:8000`.

## Production Deployment

Recommended setup:

1. Frontend on Vercel
2. Backend on Railway

### Frontend

Set this environment variable on Vercel:

```bash
VITE_API_BASE=https://your-backend-domain.example.com
```

Build command:

```bash
npm run build
```

### Backend

Deploy the repo as a Python service using:

```bash
uvicorn api.index:app --host 0.0.0.0 --port $PORT
```

Install command:

```bash
pip install -r requirements.txt
```

## Notes

- Yahoo Finance is free but can still be slower than paid feeds.
- The UI is designed to render immediately and hydrate data asynchronously.
- AI analysis currently uses a local fallback summary in the frontend.
