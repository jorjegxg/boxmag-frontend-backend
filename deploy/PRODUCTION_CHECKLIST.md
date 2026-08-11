# Production checklist (Boxmag)

Use before taking live Stripe traffic. Redeploy with `bash scripts/deploy.sh` only — never wipe a live DB.

## Secrets and URLs (required)

Backend `assertProductionEnv()` refuses to start unless these hold when `NODE_ENV=production`:

| Variable | Requirement |
|----------|-------------|
| `CORS_ORIGIN` | Explicit list (never `*` / empty), e.g. `https://boxmag.eu,https://www.boxmag.eu` |
| `DB_PASSWORD` | Strong; not empty / `change-me-*` |
| `MYSQL_ROOT_PASSWORD` / `MYSQL_PASSWORD` | Strong (compose requires them) |
| `MINIO_ROOT_PASSWORD` | Strong; not `change-me-*` |
| `ADMIN_PASSWORD` | Strong; not `change-me-*` |
| `USER_SESSION_SECRET` | Dedicated secret (required; no `ADMIN_PASSWORD` fallback in prod) |
| `STRIPE_SECRET_KEY` | Live key `sk_live_…`, **or** `sk_test_…` with `STRIPE_ALLOW_TEST_KEYS=1` |
| `STRIPE_ALLOW_TEST_KEYS` | Set `1` only for production host still on Stripe test mode; remove before go-live |
| `STRIPE_WEBHOOK_SECRET` | From Stripe Dashboard / `stripe listen` (test vs live mode must match the secret key) |
| `STRIPE_SUCCESS_URL` | `https://…/checkout/success?session_id={CHECKOUT_SESSION_ID}` |
| `STRIPE_CANCEL_URL` | `https://…/checkout/cancel` |
| `FRONTEND_BASE_URL` | Public `https://` (no localhost) |
| `BACKEND_PUBLIC_URL` | Public API `https://` (baked into Next as `NEXT_PUBLIC_BACKEND_URL`) |

Also set:

- `NEXT_PUBLIC_APP_ENV=production` at Docker frontend build
- `MINIO_PUBLIC_BASE_URL=https://storage.boxmag.eu` (or your CDN)
- SMTP vars (`EMAIL_ORDERS_*`, `SMTP_*`) for order emails
- `ADMIN_COOKIE_DOMAIN=boxmag.eu` if admin UI and API are on different subdomains

## Stripe webhook

1. Point Stripe to `https://api.boxmag.eu/api/payments/webhook` (or your API host).
2. Put signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Prefer webhook as the paid-mark path; success page poll is read-only for status/email.

## Host networking

- Compose binds MySQL / MinIO / app ports to `127.0.0.1` only.
- Terminate TLS with nginx; example: [`deploy/nginx/boxmag.conf.example`](nginx/boxmag.conf.example).
- Do not publish MinIO console or MySQL on the public internet.

## Wipe / bootstrap (dangerous)

| Script | When |
|--------|------|
| `scripts/deploy.sh` | Safe redeploy (pull + rebuild, **no** data wipe) |
| `scripts/run-production.sh` | Full wipe + reseed — **empty hosts only** |
| `scripts/reset-db.sh` | Local reset |

Production wipe scripts refuse unless `ALLOW_PROD_WIPE=1`:

```bash
ALLOW_PROD_WIPE=1 bash scripts/run-production.sh --yes
```

## Schema changes

Apply incremental SQL with:

```bash
cd boxmag-backend && npm run db:migrate
```

Do **not** run `reset_and_seed.sql` on a live database.

## Smoke after deploy

1. `GET https://api…/api/health` OK
2. Shop + add to cart + checkout redirect to Stripe
3. Pay test/live → webhook marks paid → success page shows order number
4. Admin login + open an order; attachment download works via API (not public MinIO URL)
5. Guest registration CTA on success still prefills email
