# SOURCE OF TRUTH — Boxmag behavior

**Autoritate:** acest fișier definește comportamentul așteptat al produsului.
`AGENTS.md` = hartă de navigare / setup. Docs Cypress = selectori și pași UI.
La conflict: **codul + acest fișier** câștigă; update SoT + test în același PR.

**Piramidă de teste:** unit FE (Vitest) · unit/API BE (Vitest + Supertest) · e2e Cypress · smoke CI.
Fără visual regression, OpenAPI contract, Gherkin.

**Regulă:** fiecare invariantă are ID `INV-*`. Test nou fără ID aici = out of scope.
Schimbare de comportament = update SoT + test pe nivelul potrivit.

---

## 1. Invariante

### Cantitate & prețuri

| ID | Regulă | Cod |
|----|--------|-----|
| `INV-QTY-100` | Cantitate minimă pe linie e-commerce = **100**. UI clampează; API checkout/admin respinge sub 100. | `boxmag-backend/src/constants/order.ts`, `boxmag4/app/constants/order.ts` |
| `INV-TIERS` | Tier-uri afișate în shop: **300**, **500**, **Pallet**. Legacy `100` / `<100` / `under100` filtrate. | `boxmag-backend/src/constants/price-tiers.ts` |
| `INV-TAX-SERVER` | Taxa la checkout = `TAX_PERCENT` din env (default 21%). **Nu** se încredere în `vatPercent` de la client. | `payments.route.ts` |
| `INV-CHECKOUT-TIER-300` | Prețul de checkout e recalculat server-side din catalog, tier **`"300"`** (ex-tax) + shipping din DB. Client prices overwrite = ignorat. | `services/checkout-pricing.ts`, `payments.route.ts` |

### Plăți Stripe

| ID | Regulă | Cod |
|----|--------|-----|
| `INV-WEBHOOK-PAID` | Doar webhook Stripe marchează comanda `paid`. `GET /api/payments/sessions/:id` e read-only (status + order id/number + email; fără PII contact). | `payments.route.ts`, `app.ts` (raw body) |
| `INV-STRIPE-LOCK` | Admin **nu** poate schimba manual `payment_status` dacă există `stripe_session_id`. | `orders.route.ts` |
| `INV-PAY-STATUS` | Valori permise: `pending`, `paid`, `failed`. | `orders.route.ts` |

### Comenzi

| ID | Regulă | Cod |
|----|--------|-----|
| `INV-ORDER-STATUS` | Valori permise: `new`, `in progress`, `completed`, `done`. | `orders.route.ts` |
| `INV-GUEST-LINK` | La verify-email / register reușit, comenzile guest cu același email se leagă de user. | `auth.route.ts`, `link-guest-orders.ts` |

### Auth

| ID | Regulă | Cod |
|----|--------|-----|
| `INV-AUTH-ADMIN` | Admin: cookie `boxmag-admin-session` **sau** `Authorization: Bearer` / `x-admin-token`. Fără config → 503 pe rute protejate. | `require-admin.ts` |
| `INV-AUTH-USER` | Customer: cookie `boxmag-user-session` (HMAC, TTL 14 zile) + `localStorage` pe FE (`boxmag.auth.*`). | `require-user.ts`, `user-auth.ts` |
| `INV-AUTH-EMAIL-SCOPE` | `GET /api/orders` fără `?email=` = admin only. Cu `?email=` = admin sau user cu email potrivit. | `require-admin-or-user-email.ts` |

### Fluxuri FE

| ID | Regulă | Cod |
|----|--------|-----|
| `INV-B2B-GUARDS` | `/order-summary` fără draft complet → redirect `/business`. `/business/order-success` fără payload session → redirect `/business`. | `order-summary/page.tsx`, `b2b-order-success.ts` |
| `INV-I18N-COOKIE` | Limba = cookie `boxmag.language`. Prefix `/ro/*`, `/de/*` → path fără prefix + set cookie. | `middleware.ts` |
| `INV-CONTACT-NEXT` | Formular contact = doar Next.js `POST /api/contact` (nu `boxmag-backend`). | `boxmag4/app/api/contact` |

### Ops (nu e2e produs)

| ID | Regulă |
|----|--------|
| `INV-NO-PROD-WIPE` | Nu șterge DB live. `reset_and_seed` / wipe doar local; prod refuză fără `ALLOW_PROD_WIPE=1`. Deploy doar `scripts/deploy.sh`. |

---

## 2. Fluxuri canonice

### B2C

```
/shop → /products/[key] → cart (localStorage) → /checkout
  → POST /api/payments/create-checkout-session → Stripe
  → webhook marks paid → /checkout/success?session_id= (poll read-only, clear cart)
  → /checkout/cancel păstrează cart
```

Așteptări: min qty 100; prețuri cu taxă pe UI; server recalculează la create-session; guest cere email; VAT + shipping obligatorii.

### B2B

```
/business (Zustand) → /order-summary → POST /api/orders
  → session payload → /business/order-success → (opțional) /registration
```

Așteptări: guards `INV-B2B-GUARDS`; attachment opțional → MinIO; guest OK.

### Auth customer

```
/registration → email verify → /verify-email?token=
  → login pe /account → profile / addresses / orders
```

Așteptări: cont inactiv până la verify; `INV-GUEST-LINK` la verify.

### Admin

```
/admin/login → cookie → /admin → orders | box-types | shipping-methods
```

Așteptări: middleware pe `/admin/*` except login; UI RO; `INV-STRIPE-LOCK` pe detalii comandă.

---

## 3. Matrice INV → teste

Legendă: **OK** = există assert; **TODO** = de adăugat; **—** = neaplicabil la acel nivel.

| INV | Unit BE | Unit FE | E2E Cypress | Smoke |
|-----|---------|---------|-------------|-------|
| `INV-QTY-100` | OK `payments`, `box-types`, `price-tiers` | OK `cart_store` | OK `product-detail`, `shop`, `checkout` | — |
| `INV-TIERS` | OK `price-tiers`, `box-types` | — | OK `product-detail` | — |
| `INV-TAX-SERVER` | OK `payments` | — | OK `checkout` (body) | — |
| `INV-CHECKOUT-TIER-300` | OK `payments` | — | OK `checkout` | — |
| `INV-WEBHOOK-PAID` | OK `payments` | — | OK success poll (mock) | — |
| `INV-STRIPE-LOCK` | OK `orders` | — | — | — |
| `INV-PAY-STATUS` | OK `orders` | — | — | — |
| `INV-ORDER-STATUS` | OK `orders` | — | OK `admin-orders` | — |
| `INV-GUEST-LINK` | OK `auth`, `link-guest-orders` | — | OK `checkout-guest-create-account`, `b2b-order-success` | — |
| `INV-AUTH-ADMIN` | OK `require-admin`, `session-tokens` | OK `admin-auth` | OK `admin-login` | — |
| `INV-AUTH-USER` | OK `auth` login/logout, `session-tokens` | — | OK `login`, `account` | — |
| `INV-AUTH-EMAIL-SCOPE` | OK `require-admin` | — | — | — |
| `INV-B2B-GUARDS` | — | OK `b2b-order-success` | OK `order-summary-guard`, `b2b-order-success` | — |
| `INV-I18N-COOKIE` | — | — | OK `language-i18n`, `smoke` | OK `smoke` |
| `INV-CONTACT-NEXT` | — | OK `contact-route` | OK `contact` | — |
| `INV-NO-PROD-WIPE` | OK `env.production` (parțial) | — | — | — |

---

## 4. Cum rulezi testele

```bash
# Unit backend
cd boxmag-backend && npm test

# Unit frontend
cd boxmag4 && npm test

# Ambele (root)
npm test

# E2E (frontend :3006; multe spec-uri mock; unele cer backend+DB+MinIO)
cd boxmag4 && npm run cypress:run

# Smoke HTTP (servicii pornite)
bash scripts/smoke-http.sh
```

CI: `.github/workflows/test.yml` (PR) = BE unit + FE unit + build.
Smoke Cypress + HTTP: `workflow_dispatch` pe același workflow.
Deploy `main`: `.github/workflows/deploy.yml` = BE unit + FE unit + build, apoi deploy.
