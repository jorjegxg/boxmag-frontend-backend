# Documentatie proiect - Boxmag frontend + backend

> Pentru agenți LLM / Cursor: vezi [AGENTS.md](AGENTS.md) — ghid în engleză cu toate paginile, fluxurile și API-urile.

## 1) Descriere generala

Acest repository contine doua aplicatii principale:

- `boxmag4` - aplicatia frontend (Next.js + React + TypeScript).
- `boxmag-backend` - API backend (Express + TypeScript + MySQL + MinIO).

La nivel de infrastructura locala, proiectul foloseste:

- MySQL (persistenta date).
- MinIO (stocare imagini produse).
- `docker-compose.yml` pentru pornire rapida servicii dependente.

---

## 2) Structura repository

- `boxmag4/` - aplicatia web (B2C + B2B + admin).
- `boxmag-backend/` - API-ul principal pentru box types, produse, preturi, comenzi.
- `docker-compose.yml` - MySQL + MinIO (+ backend/frontend cu profilul `app`).
- `boxmag-backend/Dockerfile`, `boxmag4/Dockerfile` - imagini production pentru API si Next.js.
- `.env.example` - variabile de mediu pentru frontend, backend, DB, SMTP, MinIO.
- `README.md` (root) - rulare cu Docker (productie vs. development).
- `AGENTS.md`, `SOURCE_OF_TRUTH.md` - harta aplicatiei si comportamentul asteptat.
- `scripts/` - deploy, reset DB, smoke HTTP.
- `.github/workflows/` - CI (teste) si deploy.

---

## 3) Stack tehnic

### Frontend (`boxmag4`)

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Zustand (state management)
- Componente UI bazate pe Radix/shadcn (`components/ui`)

### Backend (`boxmag-backend`)

- Node.js + Express 5
- TypeScript
- mysql2 (pool DB)
- multer (upload)
- MinIO SDK (object storage)
- Stripe (plati B2C)
- Nodemailer (emailuri tranzactionale)

### Alte integrari

- SMTP/Nodemailer pentru contact, verificare email, reset parola, notificari comenzi.
- `jsvat` + VIES/ANAF pentru validare TVA (`boxmag4/app/api/vat-lookup`).
- Stripe Checkout + webhook pentru platile B2C.
- BNR (XML) pentru cursul EUR/RON.

---

## 4) Configurare mediu

Variabilele principale sunt in `.env.example`:

- API/porturi: `PORT`, `NEXT_PUBLIC_BACKEND_URL`, `CORS_ORIGIN`
- Taxe: `TAX_PERCENT`, `NEXT_PUBLIC_TAX_PERCENT`
- DB: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Docker DB bootstrap: `MYSQL_PORT`, `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `CONTACT_TO`, `ORDERS_NOTIFICATION_TO`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`, `STRIPE_CURRENCY`
- Auth: `ADMIN_PASSWORD`, `ADMIN_API_TOKEN`, `USER_SESSION_SECRET`, `FRONTEND_BASE_URL`
- MinIO: `MINIO_ENDPOINT`, `MINIO_PORT_API`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_BUCKET_NAME`, `MINIO_PUBLIC_BASE_URL`

---

## 5) Rulare locala (rezumat)

1. Copiaza `.env.example` in `.env` si completeaza valorile.
2. Porneste dependintele:
   - `docker compose up -d` (MySQL + MinIO)
   - optional, tot stack-ul in containere: `docker compose --profile app up -d --build`
3. Porneste backend (daca nu folosesti profilul `app`):
   - in `boxmag-backend`: `npm install` si `npm run dev`
4. Porneste frontend:
   - in `boxmag4`: `npm install` si `npm run dev`

Porturi uzuale observate:

- Frontend: `http://localhost:3006`
- Backend: `http://localhost:3005`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

---

## 6) Comportament, pagini si API

Acest fisier acopera **doar setup-ul**. Pentru restul, sursele autoritative sunt:

- [SOURCE_OF_TRUTH.md](SOURCE_OF_TRUTH.md) - comportamentul asteptat al produsului: invariante `INV-*`,
  fluxuri canonice (B2C, B2B, auth, password reset, admin) si matricea invarianta -> test.
- [AGENTS.md](AGENTS.md) - harta de navigare: fiecare pagina (scop, fisiere cheie, API, capcane),
  rutele Next.js `app/api/*`, rutele backend `/api/*`, store-urile Zustand si tabelele MySQL.
- [README.md](README.md) - rulare cu Docker (productie vs. override de development).

Nu duplica fluxurile aici; la conflict castiga codul + `SOURCE_OF_TRUTH.md`.

---

## 7) Baza de date

- Schema + seed pentru DB locala noua: `boxmag-backend/db/reset_and_seed.sql`
- Migratii numerotate, aplicate in ordine: `boxmag-backend/db/migrations/` (`npm run db:migrate`)
- Imagini demo in MinIO: `boxmag-backend/db/seed_minio_images.js`

Orice schimbare de schema = fisier nou in `migrations/` + oglindire in `reset_and_seed.sql`.

**Atentie:** `reset_and_seed.sql` / `db:reset` sunt doar pentru local/dev. Scripturile refuza
`NODE_ENV=production` fara `ALLOW_PROD_WIPE=1`.

---

## 8) Testare

| Unde | Framework | Comanda |
|------|-----------|---------|
| `boxmag-backend/src/__tests__/` | Vitest + Supertest | `cd boxmag-backend && npm test` |
| `boxmag4/lib/__tests__/` | Vitest + RTL | `cd boxmag4 && npm test` |
| `boxmag4/cypress/e2e/` | Cypress | `cd boxmag4 && npm run cypress:run` |
| Smoke HTTP | bash | `npm run smoke` (din root) |

Ambele suite unit din root: `npm test`.
CI: `.github/workflows/test.yml` (PR) si `.github/workflows/deploy.yml` (deploy pe `main`).

---

## 9) Comenzi utile

### Root

- `npm test` - unit backend + frontend
- `npm run smoke` - smoke HTTP pe serviciile pornite
- `npm run reset:db` - reset DB locala
- `npm run optimize:images`

### Frontend (`boxmag4`)

- `npm run dev` (port 3006), `npm run build`, `npm run start`, `npm run lint`
- `npm test`, `npm run cypress:open`, `npm run cypress:run`

### Backend (`boxmag-backend`)

- `npm run dev`, `npm run build`, `npm run start`, `npm run check`
- `npm test`
- `npm run db:migrate`, `npm run db:reset`, `npm run db:seed:images`

---

## 10) Deploy

Redeploy productie: **doar** [`scripts/deploy.sh`](scripts/deploy.sh) (direct sau via GitHub Actions).
Scriptul ruleaza migratiile (`db:migrate`) inainte de restart. Nu rula `docker-compose.dev.yml` pe VPS-ul public
(vezi [README.md](README.md)).
