# Orca

## Services
- `API` (root project): job orchestration backend (queue/invoke/sync, workers, DB writes), runs on `http://localhost:3000`.
- `Web` (`./web`): control-plane UI for functions/runs/dashboards.
- `Playground` (`./playground`): demo SvelteKit app that registers functions and invokes jobs against the API.

## Local Setup
1. Install dependencies:
```sh
bun run install:all
```
2. Create env files:
```sh
bun run env:generate
```
If the script does not work in your environment, do it manually:
- Root: copy `/Users/akcodeworks/dev/orca/example.env` to `.env`
- Web: copy `/Users/akcodeworks/dev/orca/web/example.env` to `web/.env`
- Playground: copy `/Users/akcodeworks/dev/orca/playground/example.env` to `playground/.env`

3. Start Postgres (root):
```sh
docker compose up -d
```
4. Initialize database schema/client:
```sh
bun run db:init
```

### Required env vars
- Root `.env`
  - `DATABASE_URL`: postgres connection string for Prisma/API.
  - `ORCA_TOKEN`: bearer token required by API auth routes.
  - `ORCA_APP_URL`: upstream app endpoint for sync/invoke (playground API route).
  - `ORCA_WEB_URL`: web URL reference (currently informational, will be used in the future to validate incoming API requests).
- Web `.env`
  - `ORCA_API_BASE_URL`: Orca API base URL (usually `http://localhost:3000`).
  - `ORCA_API_TOKEN`: bearer token for API auth (must match `ORCA_TOKEN`).
- Playground `.env`
  - `ORCA_API_URL`: Orca API URL used by OrcaClient (usually `http://localhost:3000`).
  - `ORCA_TOKEN`: bearer token for OrcaClient (must match `ORCA_TOKEN`).

## Run Locally
Use separate terminals:

1. API (root):
```sh
bun run dev
```

2. Web:
```sh
bun run dev:web
```

3. Playground:
```sh
bun run dev:playground
```

Then open:
- API: `http://localhost:3000` (If using a tool like Postman or Insomnia, use this URL for API requests and use Bearer auth with the `ORCA_TOKEN` value.)
- Web: Vite URL shown in terminal (commonly `http://localhost:5174`)
- Playground: Vite URL shown in terminal (commonly `http://localhost:5173`)
