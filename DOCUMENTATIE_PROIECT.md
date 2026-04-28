# Documentatie proiect - Boxmag frontend + backend

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
- `docker-compose.yml` - MySQL + MinIO.
- `.env.example` - variabile de mediu pentru frontend, backend, DB, SMTP, MinIO.
- `README.md` (root) - momentan minimal.

---

## 3) Stack tehnic

### Frontend (`boxmag4`)

- Next.js (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Zustand (state management)
- Componente UI bazate pe Radix/shadcn (`components/ui`)

### Backend (`boxmag-backend`)

- Node.js + Express
- TypeScript
- mysql2 (pool DB)
- multer (upload)
- MinIO SDK (object storage)

### Alte integrari

- SMTP/Nodemailer pentru formularul de contact.
- `jsvat` pentru validare TVA in endpoint-ul de contact.

---

## 4) Configurare mediu

Variabilele principale sunt in `.env.example`:

- API/porturi: `PORT`, `NEXT_PUBLIC_BACKEND_URL`, `CORS_ORIGIN`
- Taxe: `TAX_PERCENT`, `NEXT_PUBLIC_TAX_PERCENT`
- DB: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Docker DB bootstrap: `MYSQL_PORT`, `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_TO`
- MinIO: `MINIO_ENDPOINT`, `MINIO_PORT_API`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_BUCKET_NAME`, `MINIO_PUBLIC_BASE_URL`

---

## 5) Rulare locala (rezumat)

1. Copiaza `.env.example` in `.env` si completeaza valorile.
2. Porneste dependintele:
   - `docker compose up -d` (MySQL + MinIO)
3. Porneste backend:
   - in `boxmag-backend`: `npm install` si `npm run dev`
4. Porneste frontend:
   - in `boxmag4`: `npm install` si `npm run dev`

Porturi uzuale observate:

- Frontend: `http://localhost:3006`
- Backend: `http://localhost:3005`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

---

## 6) Frontend - pagini si fluxuri

### Pagini principale

- Home: `boxmag4/app/page.tsx`
- Shop: `boxmag4/app/shop/page.tsx`
- Shop 2: `boxmag4/app/shop-2/page.tsx`
- Business (configurator B2B): `boxmag4/app/business/page.tsx`
- Order summary: `boxmag4/app/order-summary/page.tsx`
- Checkout: `boxmag4/app/checkout/page.tsx`
- Contact: `boxmag4/app/contact/page.tsx`
- Account/Registration: `boxmag4/app/account/page.tsx`, `boxmag4/app/registration/page.tsx`
- Pagini informative: `about`, `delivery`, `how-to-buy`, `regulations`, `privacy-policy`, `complaints-and-returns`

### Layout si sectiuni globale

- Layout global: `boxmag4/app/layout.tsx`
- Componente globale: `boxmag4/app/global/components/*`
- Internationalizare de baza: `boxmag4/app/i18n/*` + `boxmag4/middleware.ts`

### State management (frontend)

- Cart: `boxmag4/app/stores/cart_store.ts`
- Tabele e-commerce: `boxmag4/app/stores/table_e_commerce_store.ts`
- Business flow: `boxmag4/app/business/store/business_store.ts`
- Draft comanda business: `boxmag4/app/stores/business_order_store.ts`

---

## 7) Zona admin

- Dashboard admin: `boxmag4/app/admin/page.tsx`
- Editare box type: `boxmag4/app/admin/box-types/[id]/edit/page.tsx`
- Store admin: `boxmag4/app/admin/use-admin-box-types-store.ts`

Capabilitati actuale:

- Vizualizare comenzi.
- Update status comenzi.
- CRUD partial pentru box types/produse/preturi.
- Upload imagine produs (prin backend, stocat in MinIO).

---

## 8) Backend - API si servicii

### Fisiere de baza

- Entry/server: `boxmag-backend/src/server.ts`
- App init + middleware: `boxmag-backend/src/app.ts`
- Config env: `boxmag-backend/src/config/env.ts`
- DB pool: `boxmag-backend/src/db/mysql.ts`
- MinIO service: `boxmag-backend/src/services/minio.ts`

### Rute

- Health: `boxmag-backend/src/routes/health.route.ts`
- Box types + produse + preturi + upload: `boxmag-backend/src/routes/box-types.route.ts`
- Orders + update status: `boxmag-backend/src/routes/orders.route.ts`

### Baza de date

Schema + seed:

- `boxmag-backend/db/reset_and_seed.sql`
- `boxmag-backend/db/reset_and_seed.sh`
- `boxmag-backend/db/seed_minio_images.js`

Entitati principale:

- `box_types`
- `box_type_products`
- `box_type_product_prices`
- `orders`
- `contacts`

---

## 9) API intern si comunicare frontend-backend

Frontend-ul face request-uri catre:

- `${NEXT_PUBLIC_BACKEND_URL}/api/box-types...`
- `${NEXT_PUBLIC_BACKEND_URL}/api/orders...`

Formularul de contact foloseste un endpoint Next local:

- `boxmag4/app/api/contact/route.ts`

Acest endpoint trimite email prin SMTP.

---

## 10) Testing si calitate

- Nu exista in prezent o suita standard de teste automate (Jest/Vitest/Playwright) configurata la nivel principal.
- Exista doar cod de test punctual in `boxmag4/app/test/test.tsx`.

---

## 11) Observatii importante (stare actuala)

- Exista fisiere de runtime `.next` neversionabile in working tree (artefacte dev).
- README-urile curente nu reflecta complet setup-ul real al proiectului.
- Exista nealiniere intre unele valori documentate si configuratia efectiva (ex. port backend in README backend vs `.env.example`).

---

## 12) Comenzi utile

### Frontend (`boxmag4/package.json`)

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

### Backend (`boxmag-backend/package.json`)

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run check`
- `npm run db:reset`
- `npm run db:seed:images`

---

## 13) Recomandare de documentare ulterioara

Pentru onboarding mai rapid, urmatorii pasi utili:

- completare `README.md` din root cu setup complet end-to-end;
- exemplu clar de flux B2B (de la selectare box pana la order submit);
- documentatie endpoint-uri API (request/response examples);
- clarificare strategii de auth/admin pentru productie.
