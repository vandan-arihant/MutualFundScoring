# Equity Mutual Fund Scoring

Scores the Indian equity mutual fund universe against a 9-parameter matrix and
serves the results to a React dashboard. Scores refresh once a day.

```
EquityMFScoringModel/     FastAPI service + the scoring model
  code/
    score_intersection_funds.py   the scoring matrix (also a standalone CLI)
    data_sources.py               the only module that touches the live feeds
    cache_store.py                the served snapshot, mirrored to disk
    scheduler.py                  the daily refresh (APScheduler cron)
    api.py                        HTTP surface
  data/                   local snapshots of the two upstream feeds
  output/                 CLI export target (.json / .xlsx)
mutual-fund-dashboard/    React + Vite dashboard
```

## How it works

Two upstream feeds — a scheme master and a risk-metrics set — are joined on the
scheme code. Funds carrying all 9 parameters form the scored universe; each
parameter is scored 1–5 against category peers, then weighted into a composite
that maps to a rating band and a recommendation.

Two properties the design leans on:

- **`GET /api/funds` reads memory only.** A request never waits on an upstream
  feed, so the dashboard responds in milliseconds no matter how slow the
  upstream is.
- **A failed refresh is non-destructive.** Fetch errors, malformed payloads and
  scoring bugs all leave the previous rows serving and only set `last_error`.
  The dashboard degrades to "stale but valid, with a visible warning" — never to
  a blank table or a 500.

## Configuration

Both halves read a gitignored `.env`; each has a committed `.env.example`
listing every variable with placeholder values.

| | |
|---|---|
| `EquityMFScoringModel/.env` | feed URLs, `APP_ENV`, `REFRESH_TOKEN`, CORS origins, refresh schedule |
| `mutual-fund-dashboard/.env` | `VITE_API_BASE_URL` |

**The two feed URLs are treated as credentials.** They are redacted out of every
log line and every error message the API can return — see the SECRET HYGIENE
note at the top of `data_sources.py`. Never commit a real `.env`.

Leaving `SCHEME_MASTER` or `RISK` unset serves that feed from its snapshot in
`data/` instead. That is a permanent supported mode — the whole backend runs
with no network access — and `/api/status` reports `live` vs `fixture` per feed.

## Running locally

Backend:

```bash
cd EquityMFScoringModel
python3 -m venv .venv && source .venv/bin/activate
pip install -r code/requirements.txt
cp .env.example .env        # fill in, or leave the feed URLs blank for fixtures
uvicorn api:app --reload --port 8000 --app-dir code
```

Frontend:

```bash
cd mutual-fund-dashboard
npm install
cp .env.example .env        # defaults to http://localhost:8000 if unset
npm run dev
```

The scoring model also runs standalone against the local snapshots, writing to
`output/`:

```bash
python code/score_intersection_funds.py --top 50
```

## API

| Method | Path | |
|---|---|---|
| `GET` | `/api/funds` | the scored universe plus the metadata to render it |
| `GET` | `/api/status` | cache and scheduler health |
| `POST` | `/api/refresh` | force a refresh now |
| `GET` | `/api/health` | liveness probe |

`/api/funds` returns `next_refresh_at`, which is what lets the browser skip
refetching until new data can possibly exist.

`POST /api/refresh` takes an `X-Refresh-Token` header. The token is optional in
development; under `APP_ENV=production` it is mandatory, and the endpoint
returns 503 rather than running unauthenticated.

## Deployment

`render.yaml` is a Render blueprint covering both services. Set these in the
Render dashboard rather than in the file — they are marked `sync: false`:

- `SCHEME_MASTER`, `RISK` — the feed URLs
- `REFRESH_TOKEN` — required, since the blueprint sets `APP_ENV=production`
- `EXTRA_CORS_ORIGINS` — the dashboard's URL
- `VITE_API_BASE_URL` — the API's URL, read at **build** time, so changing it
  needs a redeploy of the static site

Setting `APP_ENV=production` drops the localhost CORS origins and makes
`REFRESH_TOKEN` mandatory.

On Render's free plan a web service spins down after ~15 minutes idle and the
in-process scheduler stops with it, so the 06:30 IST refresh is missed whenever
the service is asleep. It self-heals — the next cold start sees data older than
24h and runs a catch-up refresh before serving. For a guaranteed on-time daily
refresh, use a paid instance or drive `POST /api/refresh` from an external
scheduler.
