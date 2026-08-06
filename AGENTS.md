# AGENTS.md — LLM Project Guide

Quick-reference for AI agents working in the Boxmag monorepo. For local setup and Docker commands, see [DOCUMENTATIE_PROIECT.md](DOCUMENTATIE_PROIECT.md).

---

## Project overview

| App | Path | Stack | Role |
|-----|------|-------|------|
| **Frontend** | `boxmag4/` | Next.js 16 App Router, React 19, TypeScript, Tailwind, Zustand | B2C shop, B2B configurator, customer account, admin UI |
| **Backend** | `boxmag-backend/` | Express 5, TypeScript, MySQL (`mysql2`), MinIO, Stripe | REST API, payments, email, file storage |
| **Infra** | `docker-compose.yml` | MySQL, MinIO (+ optional `app` profile for containers) | Local dependencies |

**Shared environment:** root [`.env`](.env) / [`.env.example`](.env.example). Backend loads env from repo root via `boxmag-backend/src/config/env.ts`.

**Default ports:**

| Service | Port |
|---------|------|
| Frontend | 3006 |
| Backend | 3005 |
| MySQL | 3307 |
| MinIO API | 9000 |
| MinIO Console | 9001 |

**i18n:** Cookie-based (`boxmag.language`), not file-based locales. Middleware redirects `/ro/*` and `/de/*` to unprefixed paths and sets the language cookie. Use `useLanguage()` in components.

**Global shell:** `boxmag4/app/layout.tsx` wraps all public pages with `Providers`, `TopBar`, `Header`, `Footer`. Admin uses a minimal layout at `boxmag4/app/admin/layout.tsx` (`lang="ro"`).

---

## Authentication

| Actor | Mechanism | Protected routes |
|-------|-----------|------------------|
| **Admin** | Middleware + HTTP-only cookie `boxmag-admin-session` (SHA-256 of password salt; set by Next.js `POST /api/admin/auth`) | `/admin/*` except `/admin/login` |
| **Customer** | `localStorage` (`boxmag.auth.loggedIn`, `boxmag.auth.email`) + backend cookie `boxmag-user-session` (HMAC-signed, 14-day TTL) | `/account` tabs; backend APIs with `credentials: "include"` |
| **Guest** | Email on checkout or B2B contact form | Most public pages |

**Admin API access:** Backend accepts admin cookie or `Authorization: Bearer <ADMIN_API_TOKEN>` / `x-admin-token` header (`requireAdmin` middleware).

**Customer API access:** `requireUser` middleware reads `boxmag-user-session`. Orders can also be scoped via `?email=` with `requireAdminOrUserEmail`.

---

## Core business flows

### B2C e-commerce

```
/shop → /products/[key] → cart (useCartStore) → /checkout → Stripe → /checkout/success
```

- Min order quantity per line item: **100**
- Price tiers: **300**, **500**, **Pallet** (legacy `<100` tiers filtered server-side)
- Tax applied server-side via `TAX_PERCENT` (default 21%)

### B2B custom order

```
/business (useBusinessStore) → /order-summary (useBusinessOrderStore) → POST /api/orders → /business/order-success
```

- `/order-summary` and `/business/order-success` redirect to `/business` if draft/session payload is missing
- Optional file attachment uploaded to MinIO on submit

### Admin

```
/admin/login → /admin (hub) → /admin/orders | /admin/box-types | /admin/shipping-methods
                              → /admin/orders/[id] | /admin/box-types/[id]/edit
```

- UI is in Romanian
- Protected by `boxmag4/middleware.ts`
- Shared nav in `boxmag4/app/admin/components/AdminNav.tsx`

---

## Page-by-page guide

Each section follows: **Purpose → What to expect → Key files → Backend/API → Gotchas**

---

### `/` — Home

**Purpose:** Marketing landing page with hero, product highlights, testimonials, and B2B CTA.

**What to expect:** No auth. Composes many global marketing sections. Entry point for new visitors.

**Key files:** `boxmag4/app/page.tsx`, `boxmag4/app/global/components/*` (e.g. `HeroSizeSection`, `FeaturesSection`, `NewsletterSubscribe`)

**Backend/API:** Newsletter may call `POST /api/newsletter/subscribe`. Product highlights may link to `/shop` or product pages.

**Gotchas:** Heavy i18n usage; test all three languages via cookie, not URL prefix.

---

### `/shop` — Product catalog

**Purpose:** Browse all active box types; filter by `?boxTypeId=`; add items to cart.

**What to expect:** Dynamic grid from backend catalog. Cart actions via `useCartStore`. Currency conversion via `useCurrency`.

**Key files:** `boxmag4/app/shop/page.tsx`, `boxmag4/app/stores/cart_store.ts`

**Backend/API:** `GET /api/box-types`, `GET /api/box-types/:id/products`

**Gotchas:** Prices shown with tax; tier selection matters. Min qty 100 enforced at checkout.

---

### `/products/[key]` — Product detail

**Purpose:** Single box type detail page. `[key]` is the box type slug. Optional `?itemNo=` for specific SKU.

**What to expect:** Image gallery, dimension specs, tiered pricing table, add-to-cart.

**Key files:** `boxmag4/app/products/[key]/page.tsx`, `boxmag4/app/stores/cart_store.ts`

**Backend/API:** `GET /api/box-types` (find by key), `GET /api/box-types/:id/products`

**Gotchas:** `[key]` is slug, not numeric ID. Sitemap generates URLs from backend slugs.

---

### `/boxesfetco` — BoxFix product line

**Purpose:** Landing page for the BoxFix e-commerce box product line.

**What to expect:** Static marketing content plus `ProductsTable` for that line. Training video section.

**Key files:** `boxmag4/app/boxesfetco/page.tsx`, `ProductsTable`, `TrainingProductVideoSection`

**Backend/API:** Product table may fetch box types filtered client-side.

**Gotchas:** Product-line-specific page; not the main `/shop` catalog.

---

### `/corrugated-envelopes` — Corrugated envelopes line

**Purpose:** Landing page for corrugated envelope products.

**What to expect:** Similar to `/boxesfetco` but for envelopes. `ProductsTable` + product images.

**Key files:** `boxmag4/app/corrugated-envelopes/page.tsx`

**Backend/API:** May fetch relevant box types from catalog.

**Gotchas:** Separate product-line landing; links may point to specific box types in shop.

---

### `/checkout` — Cart checkout

**Purpose:** Review cart, enter shipping/billing, select shipping method, pay via Stripe.

**What to expect:** Works for logged-in users and guests (guest email required). VAT lookup, address map, shipping cost calculation.

**Key files:** `boxmag4/app/checkout/page.tsx`, `boxmag4/app/stores/cart_store.ts`, `CheckoutShippingInformation`, `checkout-address-map`

**Backend/API:**
- `POST /api/payments/create-checkout-session`
- `GET /api/shipping-methods`
- `GET /api/exchange-rate/eur-ron` (RON payments)
- Next.js `GET/POST /api/vat-lookup`
- Next.js `GET /api/geocode`

**Gotchas:** Empty cart should redirect or show empty state. Stripe redirect URLs configured in env. RON uses live EUR/RON rate.

---

### `/checkout/success` — Payment success

**Purpose:** Post-Stripe confirmation page.

**What to expect:** Reads `?session_id=` from URL, polls backend for payment status, clears cart on success.

**Key files:** `boxmag4/app/checkout/success/page.tsx`, `boxmag4/app/stores/cart_store.ts`

**Backend/API:** `GET /api/payments/sessions/:sessionId`

**Gotchas:** Payment confirmed via Stripe webhook asynchronously. Success poll is read-only (status + order number + email). Page should handle pending state.

---

### `/checkout/cancel` — Payment cancelled

**Purpose:** User returned from Stripe after cancelling payment.

**What to expect:** Static message with links back to `/checkout` and `/shop`. Cart is preserved.

**Key files:** `boxmag4/app/checkout/cancel/page.tsx`

**Backend/API:** None.

**Gotchas:** Disallowed in `robots.ts`. No cart clearing here.

---

### `/business` — B2B configurator

**Purpose:** Custom box inquiry configurator (dimensions, cardboard type/color, print, transport, quantity, attachments).

**What to expect:** Multi-step visual configurator. State persisted in Zustand. No auth required to configure.

**Key files:** `boxmag4/app/business/page.tsx`, `boxmag4/app/business/store/business_store.ts`, `GridOfBoxes`, `CarboardType`, `TransportOptions`, `Quantity`

**Backend/API:** None on this page; data flows to `/order-summary`.

**Gotchas:** This is the entry point for B2B flow. Clearing `useBusinessStore` breaks downstream pages.

---

### `/order-summary` — B2B order review and submit

**Purpose:** Review B2B draft configuration, fill contact/VAT details, submit order to backend.

**What to expect:** **Flow guard:** redirects to `/business` if draft is incomplete. VAT lookup, optional file attachment (base64).

**Key files:** `boxmag4/app/order-summary/page.tsx`, `boxmag4/app/stores/business_order_store.ts`, `boxmag4/app/stores/business_store.ts`

**Backend/API:**
- `POST /api/orders` (B2B order creation)
- Next.js `/api/vat-lookup`

**Gotchas:** Merges data from both business stores. On success, navigates to `/business/order-success` with session payload. Disallowed in `robots.ts`.

---

### `/business/order-success` — B2B confirmation

**Purpose:** Order confirmation after B2B submit. Prompts account registration.

**What to expect:** **Flow guard:** redirects to `/business` without session payload (`readB2bOrderSuccessPayload`). Shows order summary and registration CTA.

**Key files:** `boxmag4/app/business/order-success/page.tsx`

**Backend/API:** None directly; registration links to `/registration` with query prefill.

**Gotchas:** Payload is session-scoped, not persisted in DB on this page. Refresh may lose data.

---

### `/account` — Customer account hub

**Purpose:** Profile, saved addresses, and order history for logged-in customers.

**What to expect:** Hash-based tabs: `#account`, `#address`, `#orders`. Shows inline login form when logged out (no middleware redirect).

**Key files:** `boxmag4/app/account/page.tsx`, `LoginRequiredView`

**Backend/API:**
- `GET|PUT /api/auth/profile`
- `GET|POST|PUT|DELETE /api/addresses`
- `GET /api/orders?email=`
- Next.js `/api/vat-lookup`

**Gotchas:** Auth is client-side `localStorage` + cookie. Page loads when logged out but tabs require login. Disallowed in `robots.ts`.

---

### `/account/orders/[orderNumber]` — Order detail

**Purpose:** View a single order and reorder items to cart.

**What to expect:** `[orderNumber]` is the numeric order ID. Attachment download for orders with files.

**Key files:** `boxmag4/app/account/orders/[orderNumber]/page.tsx`, `OrderAttachmentActions`, `boxmag4/app/stores/cart_store.ts`

**Backend/API:**
- `GET /api/orders/:orderId?email=`
- `GET /api/orders/:orderId/attachment?email=`

**Gotchas:** Soft auth — page renders but API fails without valid session/email match.

---

### `/registration` — Customer registration

**Purpose:** Create a new customer account with email verification.

**What to expect:** Form with VAT, terms acceptance. Supports query prefill from B2B success flow.

**Key files:** `boxmag4/app/registration/page.tsx`

**Backend/API:** `POST /api/auth/register` → sends verification email

**Gotchas:** Account is not active until email verified via `/verify-email`. Disallowed in `robots.ts`.

---

### `/verify-email` — Email verification

**Purpose:** Confirm registration via `?token=` link from email.

**What to expect:** Calls backend verification endpoint. Backend returns HTML response. Links guest orders to new user on success.

**Key files:** `boxmag4/app/verify-email/page.tsx`

**Backend/API:** `GET /api/auth/verify-email?token=`

**Gotchas:** Token expires per `VERIFICATION_EXPIRES_MINUTES`. Disallowed in `robots.ts`.

---

### `/about` — About us

**Purpose:** Company information, factory image, testimonials.

**What to expect:** Static i18n content page with `B2b` breadcrumb banner.

**Key files:** `boxmag4/app/about/page.tsx`

**Backend/API:** None.

**Gotchas:** Standard content page pattern.

---

### `/contact` — Contact form

**Purpose:** Contact form with VAT validation and file attachments.

**What to expect:** Prefills fields if user is logged in. Submits to Next.js API route (not backend).

**Key files:** `boxmag4/app/contact/page.tsx`

**Backend/API:** Next.js `POST /api/contact` (Nodemailer → SMTP)

**Gotchas:** Contact form lives entirely in Next.js, not `boxmag-backend`.

---

### `/delivery` — Delivery terms

**Purpose:** Delivery policy and terms (numbered list).

**What to expect:** Static i18n content.

**Key files:** `boxmag4/app/delivery/page.tsx`

**Backend/API:** None.

**Gotchas:** Content-only page.

---

### `/how-to-buy` — Purchase instructions

**Purpose:** How to buy guide including SWIFT/bank details.

**What to expect:** Static i18n content with copy-to-clipboard for SWIFT code.

**Key files:** `boxmag4/app/how-to-buy/page.tsx`

**Backend/API:** None.

**Gotchas:** Content-only page.

---

### `/privacy-policy` — Privacy policy

**Purpose:** GDPR/privacy policy sections.

**What to expect:** Static legal content via `PolicySection` components.

**Key files:** `boxmag4/app/privacy-policy/page.tsx`

**Backend/API:** None.

**Gotchas:** References `siteEmails` for contact addresses.

---

### `/regulations` — Terms and regulations

**Purpose:** General terms and conditions.

**What to expect:** Static legal content via `RegSection` components.

**Key files:** `boxmag4/app/regulations/page.tsx`

**Backend/API:** None.

**Gotchas:** Content-only page.

---

### `/complaints-and-returns` — Complaints and returns

**Purpose:** Complaints and returns policy.

**What to expect:** Static legal content via `ComplaintsSection` components.

**Key files:** `boxmag4/app/complaints-and-returns/page.tsx`

**Backend/API:** None.

**Gotchas:** Content-only page.

---

### `/admin/login` — Admin login

**Purpose:** Password-based admin authentication.

**What to expect:** Public page. Redirects to `/admin` if already authenticated. Romanian UI.

**Key files:** `boxmag4/app/admin/login/page.tsx`

**Backend/API:** Next.js `POST /api/admin/auth` (sets `boxmag-admin-session` cookie)

**Gotchas:** Admin login is frontend-owned; backend only validates the shared cookie/token.

---

### `/admin` — Admin hub

**Purpose:** Landing panou cu linkuri către secțiunile admin.

**What to expect:** Romanian UI. Carduri către Comenzi, Tipuri de cutii, Metode de livrare. Nav comună pe toate paginile admin (except login).

**Key files:** `boxmag4/app/admin/page.tsx`, `boxmag4/app/admin/components/AdminNav.tsx`

**Backend/API:** None pe hub.

**Gotchas:** Middleware-protected. Funcționalitățile CRUD sunt pe rutele dedicate de mai jos.

---

### `/admin/orders` — Admin orders list

**Purpose:** Listă comenzi cu status și paginare.

**What to expect:** Tabel comenzi; click pe rând → detaliu.

**Key files:** `boxmag4/app/admin/orders/page.tsx`, `admin-ro.ts`

**Backend/API:** `GET /api/orders`, `PATCH /api/orders/:id/status`

**Gotchas:** Back-linkurile din detaliu duc aici, nu pe hub.

---

### `/admin/box-types` — Admin box types

**Purpose:** Creare tipuri de cutii; activare / ascundere; link către editare.

**What to expect:** Formular creare + tabel tipuri.

**Key files:** `boxmag4/app/admin/box-types/page.tsx`, `use-admin-box-types-store.ts`

**Backend/API:** `GET|POST /api/box-types`, `POST /api/box-types/upload-images`, activate/deactivate

**Gotchas:** Imaginea e obligatorie la creare.

---

### `/admin/shipping-methods` — Admin shipping methods

**Purpose:** CRUD metode de livrare pentru checkout.

**What to expect:** Formular adăugare + tabel editabil.

**Key files:** `boxmag4/app/admin/shipping-methods/page.tsx`

**Backend/API:** `GET|POST|PUT|DELETE /api/shipping-methods`

**Gotchas:** Load include inactive (`?includeInactive=true`).

---

### `/admin/orders/[id]` — Admin order detail

**Purpose:** View and manage a single order: status, payment, send offer email, download attachment.

**What to expect:** Full order detail with admin actions. Romanian labels.

**Key files:** `boxmag4/app/admin/orders/[id]/page.tsx`, `OrderAttachmentActions`, admin-ro helpers

**Backend/API:**
- `GET /api/orders/:orderId`
- `PATCH /api/orders/:orderId/status`
- `PATCH /api/orders/:orderId/payment-status` (blocked for Stripe orders)
- `POST /api/orders/:orderId/send-offer`
- `GET /api/orders/:orderId/attachment`
- `GET /api/orders/offer-senders`

**Gotchas:** Manual payment status change is disabled for Stripe-paid orders.

---

### `/admin/box-types/[id]/edit` — Edit box type

**Purpose:** Edit box type metadata, products, tiered prices, dimensions, and images.

**What to expect:** Complex form with product/price matrix and image upload.

**Key files:** `boxmag4/app/admin/box-types/[id]/edit/page.tsx`, `boxmag4/app/admin/use-admin-box-types-store.ts`

**Backend/API:**
- `GET /api/box-types/:id/products`
- `PUT /api/box-types/:id`
- `PUT /api/box-types/:id/products`
- `POST /api/box-types/upload-image(s)`

**Gotchas:** `PUT /:id/products` bulk-replaces all products/prices. Images stored in MinIO.

---

### `/mobile-app-svg` — Mobile UI mockup

**Purpose:** Internal page displaying a static SVG mobile app mockup.

**What to expect:** Single `<img src="/mobile-app-page.svg">`. No business logic.

**Key files:** `boxmag4/app/mobile-app-svg/page.tsx`

**Backend/API:** None.

**Gotchas:** Disallowed in `robots.ts`. Not a real mobile app.

---

## Next.js API routes (not pages)

These live in `boxmag4/app/api/` and run on the frontend server:

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/admin/auth` | POST | Set `boxmag-admin-session` cookie | Password check |
| `/api/contact` | POST | Send contact form email via Nodemailer | Public |
| `/api/geocode` | GET | Address geocoding (Google/Nominatim) | Public |
| `/api/vat-lookup` | GET/POST | VAT/VIES/ANAF company lookup | Public |

**Also:** `app/sitemap.xml/route.ts` generates dynamic sitemap; `app/robots.ts` configures crawl rules.

---

## Backend API summary

Base: `${NEXT_PUBLIC_BACKEND_URL}/api/*` (default `http://localhost:3005`)

Route files in `boxmag-backend/src/routes/`:

### `/api/health`
- `GET /` — Health check + DB config preview

### `/api/auth` (`auth.route.ts`)
- `POST /login`, `POST /logout`, `POST /register`
- `GET /verify-email?token=`
- `GET|PUT /profile` (requires user session)

### `/api/box-types` (`box-types.route.ts`)
- `GET /` — List active box types with images
- `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/activate` — Admin
- `GET /:id/products` — Products with tiered prices (tax applied)
- `PUT /:id/products` — Admin bulk replace
- `POST /upload-image`, `POST /upload-images` — Admin image upload → MinIO

### `/api/orders` (`orders.route.ts`)
- `GET /` — Admin or `?email=` scoped user
- `POST /` — Public B2B order creation
- `GET /:orderId`, `GET /:orderId/attachment` — Admin or email-scoped
- `PATCH /:orderId/status`, `PATCH /:orderId/payment-status` — Admin
- `POST /:orderId/send-offer`, `GET /offer-senders` — Admin

### `/api/payments` (`payments.route.ts`)
- `POST /create-checkout-session` — B2C Stripe checkout
- `GET /sessions/:sessionId` — Poll session status (read-only: paymentStatus, order id/number, customerEmail; no PII contact; webhook marks paid)
- `POST /webhook` — Stripe webhook (raw body in `app.ts`)

### `/api/addresses` (`addresses.route.ts`)
- `GET|POST /`, `PUT|DELETE /:addressId` — Requires user session

### `/api/shipping-methods` (`shipping-methods.route.ts`)
- `GET /` — Active methods (public)
- `POST /`, `PUT|DELETE /:shippingMethodId` — Admin

### `/api/newsletter` (`newsletter.route.ts`)
- `POST /subscribe` — Public

### `/api/exchange-rate` (`exchange-rate.route.ts`)
- `GET /eur-ron` — EUR→RON rate (BNR XML, 1h cache)

**Stripe webhook** is mounted in `boxmag-backend/src/app.ts` before JSON body parser (requires raw body).

---

## State management (Zustand)

| Store | File | Used by |
|-------|------|---------|
| Cart | `boxmag4/app/stores/cart_store.ts` | `/shop`, `/products/[key]`, `/checkout`, reorder |
| E-commerce table | `boxmag4/app/stores/table_e_commerce_store.ts` | Product line landing tables |
| Business config | `boxmag4/app/business/store/business_store.ts` | `/business` configurator |
| B2B order draft | `boxmag4/app/stores/business_order_store.ts` | `/order-summary` |
| Admin box types | `boxmag4/app/admin/use-admin-box-types-store.ts` | Admin CRUD pages |

**Providers:** `LanguageProvider`, `CurrencyProvider` in `boxmag4/app/global/components/Providers`.

---

## Database (MySQL)

Schema: `boxmag-backend/db/reset_and_seed.sql` (+ ordered migrations in `boxmag-backend/db/migrations/`, applied by `npm run db:migrate` / `scripts/deploy.sh`).

| Table | Purpose |
|-------|---------|
| `box_types`, `box_type_images`, `box_type_products`, `box_type_product_prices` | Catalog |
| `users`, `pending_user_registrations` | Customer auth |
| `orders`, `contacts` | B2B + B2C orders |
| `addresses` | Saved customer addresses |
| `shipping_methods` | Checkout shipping options |
| `newsletter_subscribers` | Newsletter |
| `schema_migrations` | Applied migration filenames |

**Order statuses:** `new`, `in progress`, `completed`, `done`  
**Payment statuses:** `pending`, `paid`, `failed`

---

## Agent conventions

### Do

- Match existing patterns: Zustand stores, `credentials: "include"` for auth APIs, i18n via `useLanguage()`
- Keep env vars in root `.env`; both apps read from there
- Use backend port **3005** (not 4000 from code default)
- Run backend tests: `cd boxmag-backend && npm test` (Vitest)
- Run frontend unit tests: `cd boxmag4 && npm test` (Vitest)
- Run e2e tests: `cd boxmag4 && npx cypress run` (Cypress)
- Run all unit tests from root: `npm test`
- Production redeploy: **only** [`scripts/deploy.sh`](scripts/deploy.sh) (or GH Actions → that script). Schema changes: add a numbered file under `boxmag-backend/db/migrations/` and mirror into `reset_and_seed.sql` for fresh local DBs; deploy runs `db:migrate`

### Don't

- Commit `.next/`, `.env`, or MinIO artifacts
- Add contact form logic to backend (it lives in Next.js `/api/contact`)
- Assume route-based i18n (`/ro/about` redirects to `/about`)
- Break B2B flow guards on `/order-summary` or `/business/order-success`
- Manually change payment status for Stripe orders in admin
- **Never wipe a live DB** — `reset_and_seed.sql` / `db:reset` / MinIO `--purge` are local/dev only. Wipe scripts refuse `NODE_ENV=production` unless `ALLOW_PROD_WIPE=1`. Empty-host bootstrap only: `ALLOW_PROD_WIPE=1 bash scripts/run-production.sh`

### Key shared components

- **Shell:** `Header`, `TopBar`, `Footer`, `B2b` (breadcrumb/banner)
- **Marketing:** `ServicesSection`, `HaveAQuestion`, `NewsletterSubscribe`, `FeaturesSection`
- **Layout:** `ResponsiveLayoutWithPadding`

---

## Tests

**Comportament așteptat:** [SOURCE_OF_TRUTH.md](SOURCE_OF_TRUTH.md) (invariante `INV-*` + matrice regula→test). Schimbare de flux = update SoT + test în același PR.

| Location | Framework | Coverage |
|----------|-----------|----------|
| `boxmag-backend/src/__tests__/` | Vitest + Supertest | Auth, orders, payments, exchange rate, middleware |
| `boxmag4/` (`npm test`) | Vitest + RTL | Stores, guards, Next API handlers |
| `boxmag4/cypress/` | Cypress | E2E flows (B2C, B2B, account, admin) |
| `.github/workflows/test.yml` | CI | Unit BE+FE + build; smoke pe `workflow_dispatch` |

```bash
cd boxmag-backend && npm test
cd boxmag4 && npm test
cd boxmag4 && npx cypress run
```

---

## Related docs

- [SOURCE_OF_TRUTH.md](SOURCE_OF_TRUTH.md) — behavioral invariants and test matrix
- [DOCUMENTATIE_PROIECT.md](DOCUMENTATIE_PROIECT.md) — Romanian setup guide (partially outdated on tests/ports)
- [CE_MAI_E_DE_FACUT.md](CE_MAI_E_DE_FACUT.md) — Backlog and priorities
- [README.md](README.md) — Docker dev bind-mount setup
