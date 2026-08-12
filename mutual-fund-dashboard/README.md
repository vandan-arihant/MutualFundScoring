# Equity Fund Scoring — dashboard

React + Vite frontend for the equity mutual fund scoring API. See the
[root README](../README.md) for the project as a whole.

```bash
npm install
cp .env.example .env    # VITE_API_BASE_URL; defaults to http://localhost:8000
npm run dev             # dev server on :5173
npm run build           # production build -> dist/
npm run lint
```

The backend must be allowed to serve this origin. Locally that works out of the
box; for a deployed build, add the dashboard's URL to `EXTRA_CORS_ORIGINS` on
the API.

`VITE_API_BASE_URL` is inlined into the bundle at **build** time, not read at
runtime — changing it requires rebuilding.

## Layout

```
src/
  api/         config + the fetch layer (ApiError carries user-safe messages)
  components/  presentational components, one CSS module each
  hooks/       useFundData (fetch + refetch scheduling), theme, media query
  lib/         column definitions, formatting, filter/sort/paginate
```

The API answers from an in-memory cache and reports `next_refresh_at`, so
`useFundData` skips refetching entirely until that deadline passes, then arms
one precise timer for the moment it does.
