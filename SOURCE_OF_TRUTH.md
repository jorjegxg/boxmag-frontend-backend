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
| `INV-CHECKOUT-TIER-300` | Prețul de checkout e recalculat server-side din catalog, tier **`"300"`** (ex-tax) + shipping din DB. Client prices overwrite = ignorat. Produsele din tipuri de cutii inactive sunt respinse. | `services/checkout-pricing.ts`, `payments.route.ts` |

### Plăți Stripe

| ID | Regulă | Cod |
|----|--------|-----|
| `INV-WEBHOOK-PAID` | Doar webhook Stripe marchează comanda `paid`. `GET /api/payments/sessions/:id` e read-only (status + order id/number + email; fără PII contact). `checkout.session.completed` marchează `paid` doar dacă `session.payment_status = 'paid'`; `expired` / `async_payment_failed` nu retrogradează niciodată o comandă `paid`. | `payments.route.ts`, `app.ts` (raw body) |
| `INV-STRIPE-LOCK` | Admin **nu** poate schimba manual `payment_status` dacă există `stripe_session_id`. | `orders.route.ts` |
| `INV-PAY-STATUS` | Valori permise: `pending`, `paid`, `failed`. | `orders.route.ts` |

### Comenzi

| ID | Regulă | Cod |
|----|--------|-----|
| `INV-ORDER-STATUS` | Valori permise: `new`, `in progress`, `completed`. | `orders.route.ts` |
| `INV-GUEST-LINK` | La verify-email / login reușit, comenzile guest cu același email se leagă de user. B2C checkout **și** B2B `POST /api/orders` setează `user_id` doar dacă cookie sesiune + email match (nu pe existența email-ului în DB; `accountEmail` din body e ignorat). | `auth.route.ts`, `link-guest-orders.ts`, `payments.route.ts`, `orders.route.ts` |
| `INV-ATTACHMENT-SAFE` | Atașamentele comenzilor (upload anonim) au `Content-Type` normalizat la o listă cunoscută (MIME-ul declarat de client nu e de încredere). Inline doar PDF + imagini raster; HTML/SVG/necunoscut → `application/octet-stream` + `attachment`; non-PDF primesc `Content-Security-Policy: sandbox`. | `utils/attachment-content-type.ts`, `orders.route.ts`, `services/minio.ts` |

### Auth

| ID | Regulă | Cod |
|----|--------|-----|
| `INV-AUTH-ADMIN` | Admin: cookie `boxmag-admin-session` **sau** `Authorization: Bearer` / `x-admin-token`. Fără config → 503 pe rute protejate. Token cookie `v3.{exp}.{HMAC-SHA256(parolă, salt:v3.exp)}`, TTL 7 zile, identic în Next și backend (vector de test comun). Logout = `DELETE /api/admin/auth` (expiră cookie-ul) + buton „Deconectare” în nav. | `require-admin.ts`, `config/admin-auth.ts`, `boxmag4/lib/admin-auth.ts`, `app/api/admin/auth/route.ts` |
| `INV-AUTH-USER` | Customer: cookie `boxmag-user-session` (HMAC, TTL 14 zile) + `localStorage` pe FE (`boxmag.auth.*`). | `require-user.ts`, `user-auth.ts` |
| `INV-AUTH-EMAIL-SCOPE` | `GET /api/orders` fără `?email=` = admin only. Cu `?email=` = admin sau user cu email potrivit. | `require-admin-or-user-email.ts` |
| `INV-PASSWORD-RESET` | `POST /api/auth/forgot-password` stochează **doar** sha256 al token-ului (`users.password_reset_token_hash`) + expirare `RESET_PASSWORD_EXPIRES_MINUTES`; token-ul brut există doar în link-ul emailat. `POST /api/auth/reset-password` cere parolă ≥ 6 caractere, respinge token expirat/inexistent și golește hash + expirare la succes (single-use). Cont inexistent sau inactiv → `200 { ok: true, exists: false }` (enumerare acceptată intenționat, ca UI-ul să ofere înregistrare). Fără SMTP → 500. | `auth.route.ts`, `db/migrations/011_add_password_reset_tokens.sql` |
| `INV-AUTH-VERIFY-PROFILE` | `GET /api/auth/verify-email`: creează user din `pending_user_registrations` **sau**, dacă email-ul există deja în `users`, actualizează `password_hash` + profil (`first_name`, `last_name`, `company_name`, `vat_number`, `phone`) + `email_verified_at` / `is_active` din pending, apoi șterge pending. | `auth.route.ts` |

### Fluxuri FE

| ID | Regulă | Cod |
|----|--------|-----|
| `INV-B2B-GUARDS` | `/order-summary` fără draft complet → redirect `/business`. `/business/order-success` fără payload session → redirect `/business`. | `order-summary/page.tsx`, `b2b-order-success.ts` |
| `INV-B2B-SAVED-ADDRESS` | User logat pe `/order-summary` cu adrese în cont: default adresa salvată (shipping); toggle altă adresă / adresă salvată ca la checkout; `POST /api/orders` folosește adresa activă. Guest / fără adrese = formular manual. | `order-summary/page.tsx` |
| `INV-RATE-LIMIT` | Limitele per IP protejează doar intrările publice: login/register/verify/reset (nu `/profile`, `/logout`), POST contact/newsletter, POST `/api/orders`, checkout. Citirile și cererile autentificate ca admin (inbox, reply, persistarea server-to-server din Next) nu se numără. În Next, IP-ul client = `X-Real-IP` sau **ultima** intrare `X-Forwarded-For` (niciodată prima, controlată de client); `/api/contact` are limită proprie per IP. `/api/geocode` (60/15 min, cheie Google plătită) și `/api/vat-lookup` (120/15 min; 429 cu `code: lookup_failed`) au limită per IP. | `middleware/rate-limit.ts`, `boxmag4/lib/rate-limit.ts`, `app/api/contact/route.ts`, `app/api/admin/auth/route.ts`, `app/api/geocode/route.ts`, `app/api/vat-lookup/route.ts` |
| `INV-ACCOUNT-ADDRESS-IDENTITY` | Tab Address: `companyName` read-only din profil (edit doar My Account / VAT); `firstName` / `lastName` / `phone` prefilled din profil la adresă nouă, editabile per adresă; create/update trimite `companyName` din profil. | `account/page.tsx` (`AddressTab`) |
| `INV-I18N-COOKIE` | Limba = cookie `boxmag.language`. Prefix `/ro/*`, `/de/*` → path fără prefix + set cookie. | `proxy.ts` |
| `INV-I18N-ERRORS` | Erorile afișate clientului sunt în limba curentă. `message` din API (backend + Next) e doar EN/debug: UI-ul nu-l afișează brut, ci îl mapează la cheie i18n (`localizeApiError` / `apiErrorKey`) sau folosește fallback-ul paginii. `/api/vat-lookup` trimite `code` (`invalid_format`/`unsupported_country`/`not_found`/`lookup_failed`) → `VAT_LOOKUP_ERROR_KEYS`. Orice cheie nouă există în en/ro/de. | `lib/api-error-i18n.ts`, `vat-company.ts`, pagini customer |
| `INV-CONTACT-NEXT` | Formularul de contact trimite **doar** către Next.js `POST /api/contact`, care trimite emailul (Nodemailer). Aceeași rută forwardează payload-ul server-to-server către `POST /api/contact` din backend pentru persistare în `contact_messages` — **best-effort**: dacă backendul pică, emailul tot pleacă și submit-ul rămâne `ok`. Browserul nu apelează niciodată backendul direct pentru contact. | `boxmag4/app/api/contact/route.ts`, `contact.route.ts` |
| `INV-NEWSLETTER-UNSUB` | Fiecare email de newsletter are link de dezabonare semnat (HMAC pe email, `USER_SESSION_SECRET`) către `/newsletter/unsubscribe?email=&token=` + header `List-Unsubscribe` one-click (RFC 8058). Pagina cere confirmare explicită (nu dezabonează la încărcare). `POST /api/newsletter/unsubscribe` → `consent = 0` + `unsubscribed_at`; răspunde `ok` și pentru email necunoscut; token greșit → 400. Re-abonarea golește `unsubscribed_at`. | `newsletter.route.ts`, `services/newsletter-token.ts`, `app/newsletter/unsubscribe/page.tsx`, `db/migrations/014_add_newsletter_unsubscribe.sql` |
| `INV-ADMIN-MESSAGES` | Inbox mesaje contact = admin only (`requireAdmin`) pe `GET /api/contact`, `GET /api/contact/:id`, `GET /api/contact/reply-senders`, `POST /api/contact/:id/reply`. Reply acceptă `fromKey` ∈ `info` / `b2b` / `orders`; la succes setează `status = 'replied'` + `replied_at` + `replied_from`. Fără SMTP → 503. Status: `new` → `read` (la deschidere detaliu, doar din `new`) → `replied`. `GET /api/contact` acceptă `q`, `status` și paginare opțională. | `contact.route.ts`, `admin/messages/page.tsx` |
| `INV-ADMIN-LISTS` | Listele admin (`GET /api/orders`, `/api/contact`, `/api/customers`, `/api/newsletter/subscribers`) au paginare **opt-in** (`page` / `pageSize`, max 100, `meta.total`); fără parametri întorc lista completă. Căutarea `q` e `LIKE` cu `%`/`_`/`\` escapate. `GET /api/orders` ascunde implicit checkout-urile card abandonate (`payment_status = 'failed'` + sesiune Stripe / `items_json`), atât pentru admin cât și pentru client; admin le vede cu `includeAbandoned=true`. `/api/customers` nu selectează coloane de parolă/token. CSV abonați: BOM, quoting RFC 4180, injecție de formule neutralizată. | `utils/list-query.ts`, `orders.route.ts`, `customers.route.ts`, `newsletter.route.ts`, `admin/components/admin-list.tsx` |
| `INV-VAT-MANUAL-NAME` | VIES `valid=true` fără nume (ex. DE/ES) → `/api/vat-lookup` răspunde `ok` + `companyNameUnavailable`; UI afișează mesaj info (user completează numele manual); submit cere nume completat. | `vat-lookup/route.ts`, `vat-company.ts`, checkout/contact/registration/order-summary/account |
| `INV-VAT-LOOKUP-FALLBACK` | VIES indisponibil: pentru RO încearcă ANAF ca sursă primară; dacă tot nu merge (sau non-RO) → `ok` + `companyNameUnavailable` + `lookupUnavailable` (nu 502); UI cere nume manual. VIES `valid=false` rămâne 404 (fără override ANAF). | `vat-lookup/route.ts`, `vat-company.ts`, checkout/contact/registration/order-summary/account |
| `INV-VAT-COMPANY-EDITABLE` | Lookup-ul TVA doar **autocompletează** `companyName`: câmpul e mereu editabil. Autofill scrie doar dacă câmpul e gol sau conține încă valoarea autocompletată anterior (`shouldAutofillCompany`) — nu suprascrie numele tastat de user / din profil / din query. TVA invalid/incomplet sau eroare lookup **nu** golește numele. | `vat-company.ts`, checkout/contact/registration/order-summary/account |

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
| `INV-WEBHOOK-PAID` | OK `payments` (unpaid completed, no downgrade) | — | OK success poll (mock) | — |
| `INV-STRIPE-LOCK` | OK `orders` | — | OK `admin-orders` | — |
| `INV-PAY-STATUS` | OK `orders` | — | — | — |
| `INV-ORDER-STATUS` | OK `orders` | — | OK `admin-orders` | — |
| `INV-GUEST-LINK` | OK `auth`, `link-guest-orders`, `payments`, `orders` | — | OK `checkout-guest-create-account`, `b2b-order-success` | — |
| `INV-ATTACHMENT-SAFE` | OK `orders` (HTML/SVG download, PDF inline) | — | — | — |
| `INV-RATE-LIMIT` | OK `rate-limit` | OK `rate-limit` (+ geocode, vat-lookup) | — | — |
| `INV-AUTH-ADMIN` | OK `require-admin` (`x-admin-token`, 503), `session-tokens` | OK `admin-auth` (HMAC vector, logout) | OK `admin-login` (+ logout) | — |
| `INV-AUTH-USER` | OK `auth` login/logout/profile, `session-tokens` | — | OK `login`, `account` | — |
| `INV-AUTH-VERIFY-PROFILE` | OK `auth` verify existing-user update | — | — | — |
| `INV-PASSWORD-RESET` | OK `auth` forgot/reset-password | — | OK `password-reset` | — |
| `INV-NEWSLETTER-UNSUB` | OK `newsletter.route` | — | OK `newsletter-unsubscribe` | — |
| `INV-ADMIN-MESSAGES` | OK `contact.route` (admin list/detail/reply, 503, read bump) | — | OK `admin-messages` | — |
| `INV-ADMIN-LISTS` | OK `orders` (filters, pagination, abandoned), `admin-lists` | — | OK `admin-orders`, `admin-messages`, `admin-customers-newsletter` | — |
| `INV-AUTH-EMAIL-SCOPE` | OK `require-admin`, `orders` GET `/:id` | — | — | — |
| `INV-B2B-GUARDS` | — | OK `b2b-order-success` | OK `order-summary-guard`, `b2b-order-success` | — |
| `INV-B2B-SAVED-ADDRESS` | — | — | OK `order-summary-saved-address` | — |
| `INV-ACCOUNT-ADDRESS-IDENTITY` | — | — | OK `account-logged-in`, `account-address-cart` | — |
| `INV-I18N-COOKIE` | — | — | OK `language-i18n`, `smoke` | OK `smoke` |
| `INV-I18N-ERRORS` | — | OK `api-error-i18n` (acoperire en/ro/de), `i18n-keys` (orice `t("…")` există în en/ro/de), `vat-company`, `vat-lookup` | OK `contact`, `checkout-payment-result`, `account-logged-in` | — |
| `INV-CONTACT-NEXT` | OK `contact.route` (admin inbox) | OK `contact-route` | OK `contact` | — |
| `INV-VAT-MANUAL-NAME` | — | OK `vat-lookup`, `vat-company` | OK `contact` | — |
| `INV-VAT-LOOKUP-FALLBACK` | — | OK `vat-lookup`, `vat-company` | — | — |
| `INV-VAT-COMPANY-EDITABLE` | — | OK `vat-company` (`shouldAutofillCompany`) | OK `registration-verify`, `checkout-guest-create-account`, `checkout-payment-result`, `contact` | — |
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
