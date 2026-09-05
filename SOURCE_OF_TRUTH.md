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
| `INV-ORDER-STATUS` | Valori permise: `new`, `in progress`, `completed`. | `orders.route.ts` |
| `INV-GUEST-LINK` | La verify-email / login reușit, comenzile guest cu același email se leagă de user. B2C checkout setează `user_id` doar dacă cookie sesiune + email match (nu pe existența email-ului în DB). | `auth.route.ts`, `link-guest-orders.ts`, `payments.route.ts` |

### Auth

| ID | Regulă | Cod |
|----|--------|-----|
| `INV-AUTH-ADMIN` | Admin: cookie `boxmag-admin-session` **sau** `Authorization: Bearer` / `x-admin-token`. Fără config → 503 pe rute protejate. | `require-admin.ts` |
| `INV-AUTH-USER` | Customer: cookie `boxmag-user-session` (HMAC, TTL 14 zile) + `localStorage` pe FE (`boxmag.auth.*`). | `require-user.ts`, `user-auth.ts` |
| `INV-AUTH-EMAIL-SCOPE` | `GET /api/orders` fără `?email=` = admin only. Cu `?email=` = admin sau user cu email potrivit. | `require-admin-or-user-email.ts` |
| `INV-PASSWORD-RESET` | `POST /api/auth/forgot-password` stochează **doar** sha256 al token-ului (`users.password_reset_token_hash`) + expirare `RESET_PASSWORD_EXPIRES_MINUTES`; token-ul brut există doar în link-ul emailat. `POST /api/auth/reset-password` cere parolă ≥ 6 caractere, respinge token expirat/inexistent și golește hash + expirare la succes (single-use). Cont inexistent sau inactiv → `200 { ok: true, exists: false }` (enumerare acceptată intenționat, ca UI-ul să ofere înregistrare). Fără SMTP → 500. | `auth.route.ts`, `db/migrations/011_add_password_reset_tokens.sql` |
| `INV-AUTH-VERIFY-PROFILE` | `GET /api/auth/verify-email`: creează user din `pending_user_registrations` **sau**, dacă email-ul există deja în `users`, actualizează `password_hash` + profil (`first_name`, `last_name`, `company_name`, `vat_number`, `phone`) + `email_verified_at` / `is_active` din pending, apoi șterge pending. | `auth.route.ts` |

### Fluxuri FE

| ID | Regulă | Cod |
|----|--------|-----|
| `INV-B2B-GUARDS` | `/order-summary` fără draft complet → redirect `/business`. `/business/order-success` fără payload session → redirect `/business`. | `order-summary/page.tsx`, `b2b-order-success.ts` |
| `INV-B2B-SAVED-ADDRESS` | User logat pe `/order-summary` cu adrese în cont: default adresa salvată (shipping); toggle altă adresă / adresă salvată ca la checkout; `POST /api/orders` folosește adresa activă. Guest / fără adrese = formular manual. | `order-summary/page.tsx` |
| `INV-ACCOUNT-ADDRESS-IDENTITY` | Tab Address: `companyName` read-only din profil (edit doar My Account / VAT); `firstName` / `lastName` / `phone` prefilled din profil la adresă nouă, editabile per adresă; create/update trimite `companyName` din profil. | `account/page.tsx` (`AddressTab`) |
| `INV-I18N-COOKIE` | Limba = cookie `boxmag.language`. Prefix `/ro/*`, `/de/*` → path fără prefix + set cookie. | `middleware.ts` |
| `INV-CONTACT-NEXT` | Formularul de contact trimite **doar** către Next.js `POST /api/contact`, care trimite emailul (Nodemailer). Aceeași rută forwardează payload-ul server-to-server către `POST /api/contact` din backend pentru persistare în `contact_messages` — **best-effort**: dacă backendul pică, emailul tot pleacă și submit-ul rămâne `ok`. Browserul nu apelează niciodată backendul direct pentru contact. | `boxmag4/app/api/contact/route.ts`, `contact.route.ts` |
| `INV-ADMIN-MESSAGES` | Inbox mesaje contact = admin only (`requireAdmin`) pe `GET /api/contact`, `GET /api/contact/:id`, `GET /api/contact/reply-senders`, `POST /api/contact/:id/reply`. Reply acceptă `fromKey` ∈ `info` / `b2b` / `orders`; la succes setează `status = 'replied'` + `replied_at` + `replied_from`. Fără SMTP → 503. Status: `new` → `read` (la deschidere detaliu, doar din `new`) → `replied`. | `contact.route.ts`, `admin/messages/page.tsx` |
| `INV-VAT-MANUAL-NAME` | VIES `valid=true` fără nume (ex. DE/ES) → `/api/vat-lookup` răspunde `ok` + `companyNameUnavailable`; UI afișează mesaj info și `companyName` editabil manual; submit cere nume completat. | `vat-lookup/route.ts`, `vat-company.ts`, checkout/contact/registration/order-summary/account |
| `INV-VAT-LOOKUP-FALLBACK` | VIES indisponibil: pentru RO încearcă ANAF ca sursă primară; dacă tot nu merge (sau non-RO) → `ok` + `companyNameUnavailable` + `lookupUnavailable` (nu 502); UI cere nume manual. VIES `valid=false` rămâne 404 (fără override ANAF). | `vat-lookup/route.ts`, `vat-company.ts`, checkout/contact/registration/order-summary/account |

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
  (parolă uitată: /forgot-password → /reset-password?token=)
```

Așteptări: cont inactiv până la verify; verify creează **sau actualizează** `users` din pending (`INV-AUTH-VERIFY-PROFILE`); `INV-GUEST-LINK` la verify și la login; B2C logat setează `user_id` din sesiune. Fail load profil pe `/account` → eroare + retry, fără formular gol editabil.

### Password reset

```
/forgot-password → email cu link → /reset-password?token= → login
```

Așteptări: `INV-PASSWORD-RESET`; token single-use; cont inexistent/inactiv → `exists: false`, fără email.

### Admin

```
/admin/login → cookie → /admin → orders | box-types | shipping-methods | messages
```

Așteptări: middleware pe `/admin/*` except login; UI RO; `INV-STRIPE-LOCK` pe detalii comandă; `INV-ADMIN-MESSAGES` pe inbox contact.

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
| `INV-STRIPE-LOCK` | OK `orders` | — | OK `admin-orders` | — |
| `INV-PAY-STATUS` | OK `orders` | — | — | — |
| `INV-ORDER-STATUS` | OK `orders` | — | OK `admin-orders` | — |
| `INV-GUEST-LINK` | OK `auth`, `link-guest-orders`, `payments` | — | OK `checkout-guest-create-account`, `b2b-order-success` | — |
| `INV-AUTH-ADMIN` | OK `require-admin` (`x-admin-token`, 503), `session-tokens` | OK `admin-auth` | OK `admin-login` | — |
| `INV-AUTH-USER` | OK `auth` login/logout/profile, `session-tokens` | — | OK `login`, `account` | — |
| `INV-AUTH-VERIFY-PROFILE` | OK `auth` verify existing-user update | — | — | — |
| `INV-PASSWORD-RESET` | OK `auth` forgot/reset-password | TODO | TODO | — |
| `INV-ADMIN-MESSAGES` | OK `contact.route` (admin list/detail/reply, 503, read bump) | — | TODO `admin-messages` | — |
| `INV-AUTH-EMAIL-SCOPE` | OK `require-admin`, `orders` GET `/:id` | — | — | — |
| `INV-B2B-GUARDS` | — | OK `b2b-order-success` | OK `order-summary-guard`, `b2b-order-success` | — |
| `INV-B2B-SAVED-ADDRESS` | — | — | OK `order-summary-saved-address` | — |
| `INV-ACCOUNT-ADDRESS-IDENTITY` | — | — | OK `account-logged-in`, `account-address-cart` | — |
| `INV-I18N-COOKIE` | — | — | OK `language-i18n`, `smoke` | OK `smoke` |
| `INV-CONTACT-NEXT` | OK `contact.route` (admin inbox) | OK `contact-route` | OK `contact` | — |
| `INV-VAT-MANUAL-NAME` | — | OK `vat-lookup`, `vat-company` | OK `contact` | — |
| `INV-VAT-LOOKUP-FALLBACK` | — | OK `vat-lookup`, `vat-company` | — | — |
| `INV-NO-PROD-WIPE` | OK `env.production`, `prod-wipe-guard` | — | — | — |

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
