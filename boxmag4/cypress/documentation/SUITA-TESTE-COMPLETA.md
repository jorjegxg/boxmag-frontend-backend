# Suita Cypress — prezentare completă

Acest fișier descrie, în limba română, **tot** ce testează suita Cypress din `boxmag4/cypress/e2e/`. E gândit ca punct de plecare — pentru detalii pas-cu-pas pe un flux anume, vezi fișierul individual din `cypress/documentation/` (unde există) sau spec-ul `.cy.ts` direct.

Vezi și dashboard-ul grafic: `cypress/documentation/suita-teste-dashboard.html`.

**Stare la 2026-07-19:** 23 fișiere spec · ~186 scenarii de test (`it(...)`) · toate rulează contra frontend-ului de pe `:3006` (backend `:3005`, DB resetat automat înainte de rulare, vezi `cypress.config.ts`).

---

## Cum se rulează

```bash
cd boxmag4
npx cypress open        # interactiv
npx cypress run         # headless, toate spec-urile
npx cypress run --spec cypress/e2e/checkout.cy.ts   # un singur fișier
```

Reset DB automat înainte de rulare (`CYPRESS_RESET_DB=false` ca să-l dezactivezi). Câteva spec-uri (admin-box-types) au nevoie de backend + MySQL + MinIO pornite; restul mock-uiesc API-ul cu `cy.intercept`.

---

## 1. E-commerce B2C — magazin, produs, coș

| Spec | Scenarii | Ce testează |
| --- | --- | --- |
| `shop.cy.ts` | 9 | `/shop`: loading state, categorii + produse din API, filtrare `?boxTypeId=`, mesaj „fără produse”, add-to-cart în localStorage, click card vs. click buton, produsele apar corect pe `/checkout` |
| `product-detail.cy.ts` | 8 | PDP (`/products/[key]`): galerie imagini (primary prima), tabel prețuri fără tier legacy `<100`, `?itemNo=` selectează SKU corect, selector de mărime schimbă preț, cantitatea nu scade sub 100, butonul „+9000” (pallet), add-to-cart, produs/tip inexistent → „Product not found.” |
| `boxesfetco.cy.ts` | 7 | `/boxesfetco` (linie BoxFix): tabel din API, add-to-cart, reset cantitate după add, buton pallet, articolele ajung corect pe checkout (preț × cantitate) |
| `corrugated-envelopes.cy.ts` | 3 | `/corrugated-envelopes` (linie plicuri, boxTypeId=9): tabel din API, add-to-cart în localStorage, articolul apare corect pe checkout |
| `cart-persistence.cy.ts` | 5 | Badge-ul de coș din header și subtotalul supraviețuiesc unui reload; badge-ul numără **linii distincte**, nu cantitatea totală; ștergerea ultimului articol pe checkout duce badge-ul la zero; Undo readaugă articolul; iconița coșului duce la `/checkout` |

## 2. Checkout & plăți (Stripe)

| Spec | Scenarii | Ce testează |
| --- | --- | --- |
| `checkout.cy.ts` | 13 | Coș gol, email obligatoriu pentru guest, validare VAT (invalid/lipsă), lookup VAT completează firma automat, cele 3 metode de shipping schimbă totalul, place order guest + logat trimite body-ul corect la `create-checkout-session`, eroare API 500, buton dezactivat în timpul submit-ului |
| `checkout-payment-result.cy.ts` | 6 | `/checkout/success`: sesiune plătită → mulțumire + golește coșul; sesiune „unpaid” → păstrează coșul; eroare la verificarea sesiunii / `session_id` lipsă; `/checkout/cancel`: coșul rămâne, linkuri către checkout și boxesfetco |
| `currency-eur-ron.cy.ts` | 5 | Switch EUR→RON recalculează prețurile pe shop/PDP/checkout, apelul la `/api/exchange-rate/eur-ron`, fallback grațios dacă API-ul de curs cade, moneda persistă după reload, `Place order` trimite `currency: "ron"` |
| `account-address-cart.cy.ts` | 9 | Adresele salvate în cont apar ca „Shipping Information” la checkout (adresa default shipping, nu altele), comutare adresă salvată ↔ manuală, adresă nouă salvată în cont apare pe checkout, ștergerea adresei o elimină din checkout, `Place order` trimite adresa din cont către `create-checkout-session` |

## 3. Comenzi custom B2B (configurator)

| Spec | Scenarii | Ce testează |
| --- | --- | --- |
| `business.cy.ts` | 16 | `/business`: pașii configuratorului, breadcrumb + contact B2B, tipuri de cutii din API (+ eroare API), selectare tip cutie, query params `length/width/height` pre-completează formularul, validare (tip cutie, dimensiuni, termeni, mesaj — toate obligatorii), flux complet → `/order-summary`, opțiuni carton/print/transport |
| `order-summary-guard.cy.ts` | 2 | Acces direct la `/order-summary` fără draft B2B redirecționează la `/business` (guard de flux, fără flash de conținut) |
| `b2b-order-success.cy.ts` | 6 | Flux complet guest: `/business` → `/order-summary` (VAT `RO2816464` → firmă auto-completată) → `POST /api/orders` → `/business/order-success`; creare cont din pagina de success → login → comanda apare în `/account#orders` cu toate detaliile; pagina de success redirecționează la `/business` fără payload; „No, thanks” golește sesiunea |
| `b2b-guest-integration.cy.ts` | 1 (+ manual) | Guest plasează comandă B2B și refuză crearea contului — verificare automată + checklist manual pentru admin/email (`PAGES_TESTS_TODO2.md`) |
| `b2b-guest-create-account.cy.ts` | 1 (+ manual) | Guest plasează comandă B2B și **creează** cont din pagina de success — verificare automată + checklist manual pentru admin/email |

## 4. Cont client & autentificare

| Spec | Scenarii | Ce testează |
| --- | --- | --- |
| `login.cy.ts` | 8 | Formular guest pe `/account`, link înregistrare, validare câmpuri goale, credențiale invalide (401), email normalizat (`trim + lowercase`), login reușit → tab-uri cont, toggle vizibilitate parolă, sesiunea persistă la reload |
| `account.cy.ts` | 19 | Neautentificat: formular sign-in, fără sidebar tab-uri. Login: succes/eșec. Tab **My Account**: profil populat din API, editare câmpuri. Tab **Address**: listă goală, adresă salvată afișată, `POST` adresă nouă, mod edit + cancel. Tab **Orders**: listă goală, listă cu link către detalii. Navigare tab-uri + logout golește localStorage |
| `account-logged-in.cy.ts` | 25 | Variantă „deep-dive” a contului autentificat: shell (sidebar, tab activ, titlu, persistă la reload), My Account (3 secțiuni, butoane SAVE, loading state, editare completă), Address (`PUT`/`DELETE`, eroare la salvare, checkbox-uri default shipping/billing), Orders (statusuri multiple, navigare la detaliu), logout complet |
| `registration-verify.cy.ts` | 12 | `/registration`: randare formular, VAT lookup (debounce), înregistrare reușită → modal succes, datele apar pe profil după login, parole diferite, termeni obligatorii, email duplicat (409), prefill din query B2B (`?from=b2b-order`, email blocat). `/verify-email`: token valid/invalid/lipsă (fără apel API dacă lipsește) |

## 5. Shell global — limbă, monedă, navigare

| Spec | Scenarii | Ce testează |
| --- | --- | --- |
| `language-i18n.cy.ts` | 4 | Switch TopBar EN→RO→DE schimbă string-urile UI, prefix `/ro/...` și `/de/...` redirecționează fără prefix + setează cookie, limba persistă după reload |
| `home-navigation.cy.ts` | 8 | Hero (`HeroSizeSection`): selecturile length/width/height actualizează linkul CTA, click „GET STARTED” navighează la `/business` cu query params corecte, secțiunile home se randează, linkurile către shop/business/contact, formularul de newsletter (succes + eroare fără consimțământ) |

## 6. Contact

| Spec | Scenarii | Ce testează |
| --- | --- | --- |
| `contact.cy.ts` | 15 | Formular complet (câmpuri, buton submit, info magazin, breadcrumb), validare câmpuri obligatorii (+ focus pe primul câmp lipsă), VAT invalid, termeni neacceptați, `POST /api/contact` cu date corecte, succes → notificare + reset formular, eroare API 500, buton dezactivat în timpul submit-ului, linkuri Terms/Privacy |

## 7. Admin

| Spec | Scenarii | Ce testează |
| --- | --- | --- |
| `admin-orders.cy.ts` | 3 | `/admin/orders`: tabelul de comenzi din API, schimbare status direct din listă (`PATCH`), deschidere detaliu comandă (`/admin/orders/[id]`) + schimbare status acolo |
| `admin-box-types.cy.ts` | 1 (flux amplu) | Creare tip de cutie cu titlu + upload imagine (`POST /api/box-types/upload-images` → `POST /api/box-types`), apare în tabelul admin ca „Activ”, apoi apare în search-ul din header pe `/shop` |

## 8. Pagini statice / smoke

Nu au încă spec dedicat — vezi secțiunea „Ce nu e acoperit” mai jos (`/about`, `/delivery`, `/how-to-buy`, `/privacy-policy`, `/regulations`, `/complaints-and-returns`).

---

## Ce nu e acoperit încă

Lista completă cu bife e în `cypress/PAGES_TESTS_TODO.md` (~30 scenarii nebifate). Pe scurt, zonele fără spec Cypress azi:

- **Admin:** autentificare admin (`/admin/login`, redirect fără sesiune), CRUD metode shipping, editare tip de cutie existent, trimitere email ofertă din detaliu comandă
- **Cont client:** pagina de detaliu comandă (`/account/orders/[id]`) + reorder
- **Checkout avansat:** editare cantitate/ștergere linie direct pe checkout, upload atașament la checkout
- **Shell global:** căutarea din header (dropdown → PDP), meniul hamburger mobil
- **Pagini statice:** `/about`, `/delivery`, `/how-to-buy`, `/privacy-policy`, `/regulations`, `/complaints-and-returns`, `/mobile-app-svg`
- **Reziliență:** stări de eroare API pe mai multe pagini, SEO (`/sitemap.xml`, `robots.txt`)

Acestea rămân doar documentate ca goluri — nu au fost implementate în această trecere (scop limitat, la cererea explicită, la documentație + dashboard pentru suita existentă).

---

## Convenții comune în spec-uri

- **Mock API:** aproape toate spec-urile folosesc `cy.intercept(...)` — nu depind de date reale din DB, exceptând `admin-box-types.cy.ts` (are nevoie de backend + MySQL + MinIO pornite) și testele manuale din `PAGES_TESTS_TODO2.md`.
- **Helper-e reutilizabile** (`cypress/support/commands.ts`): `cy.visitAccountLoggedIn()`, `cy.visitAccountLoggedOut()`, `cy.visitCheckoutLoggedIn()`, `cy.visitCheckoutLoggedOut()`, `cy.mockAccountApis()`, `cy.mockCheckoutApis()`, `cy.loginAdmin()`, `cy.openAccountTab()`, `TEST_EMAIL`, `CART_STORAGE_KEY`.
- **Storage cheie:** `boxmag.cart` (Zustand persist), `boxmag.auth.loggedIn` / `boxmag.auth.email`, `boxmag.language`, `boxmag.currency`.
- **Viewport:** 1280×800 (default `cypress.config.ts`) — necesar pentru selectoarele TopBar (`max-md:hidden`).
