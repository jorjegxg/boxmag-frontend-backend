# boxmag-frontend-backend

## VPS production (required for boxmag.eu)

On the public VPS, run **only** the production compose file (`next start`), never the
dev override:

`docker compose --profile app --env-file .env -f docker-compose.yml up -d --build`

`docker-compose.dev.yml` starts `next dev` (HMR/Turbopack). That mode has repeatedly
OOM-killed this 4GB host when proxied behind nginx.

## VPS / local development with Docker bind mounts

Use the override **only on a non-public machine**, or change published ports so it
does not replace production on `:3006` / `:3005`.

### 1) Prepare environment

Create a local `.env` in repo root (you can copy from `.env.example`) and set
at least:

- `NODE_ENV=development`
- `BACKEND_PUBLIC_URL=http://localhost:3005`
- `CORS_ORIGIN=http://localhost:3006,https://boxmag.eu,https://www.boxmag.eu`

If your VPS exposes ports publicly, replace `localhost` with your VPS domain or
public host where needed.

### 2) Start development stack

Run from repository root:

`docker compose --profile app --env-file .env -f docker-compose.yml -f docker-compose.dev.yml up -d`

This keeps MySQL/MinIO services from `docker-compose.yml` and overrides app
services (`frontend`, `backend`) with bind mounts + watch-mode commands.

### 3) How live reload works

- `./boxmag4` is mounted to `/app` in the frontend container and runs
  `next dev` with host `0.0.0.0`.
- `./boxmag-backend` is mounted to `/app` in the backend container and runs
  `ts-node-dev`.
- Each app container has its own named `node_modules` volume to avoid bind-mount
  conflicts and unnecessary host dependency installs.
- Polling variables are enabled for reliable file-watch behavior on VPS/docker
  filesystems.

### 4) Useful commands

- Logs: `docker compose --profile app -f docker-compose.yml -f docker-compose.dev.yml logs -f frontend backend`
- Stop stack: `docker compose --profile app -f docker-compose.yml -f docker-compose.dev.yml down`
- Reinstall deps in container (if needed):
  - frontend: `docker compose --profile app -f docker-compose.yml -f docker-compose.dev.yml exec frontend npm ci`
  - backend: `docker compose --profile app -f docker-compose.yml -f docker-compose.dev.yml exec backend npm ci`

### 5) Quick validation checklist

- Edit a frontend file in `boxmag4` and refresh page on port `3006`.
- Edit a backend file in `boxmag-backend/src` and confirm auto-restart in logs.
- Confirm MySQL and MinIO data persists across restarts.
