# Cypress E2E — To-do teste pagini & funcționalități

**Culori Todo Tree:**


| Tag    | Culoare | Semnificație                                                |
| ------ | ------- | ----------------------------------------------------------- |
| `FLOW` | purple  | Flux cross-page / feature                                   |
| `PAGE` | blue    | O singură rută                                              |
| `TEST` | orange  | Un scenariu de test — bifează `[x]` când e implementat      |
| `DONE` | green   | Zona are deja spec-uri Cypress (golurile rămân ca `TEST`)   |


Auth: Guest | Customer | Admin

---

## P0 — E-commerce B2C

- [ ] FLOW Magazin B2C → PDP → coș → checkout → Stripe
  - [x] TEST Shop încarcă categorii și produse din API | shop.cy.ts
  - [x] TEST Filtrul /shop?boxTypeId= arată doar produsele potrivite | shop.cy.ts
  - [x] TEST Adaugă în coș din shop — cantitatea default e 100 | shop.cy.ts
  - [x] TEST Deschide PDP din card shop — URL folosește slug-ul produsului | shop.cy.ts
  - [x] TEST PDP: galerie imagini, tabel tipuri (300 / 500 / Pallet), adauga în coș | product-detail.cy.ts
  - [x] TEST PDP: ?itemNo= selectează SKU-ul corect și actualizează prețurile | product-detail.cy.ts
  - [x] TEST PDP: cantitate sub 100 se ajustează la 100 | product-detail.cy.ts
  - [x] BUG PDP: butonul pallet SUPRASCRIE cantitatea cu 9000 în loc s-o adune (100+9000=9100 ca pe /boxesfetco) — documentat, nefixat | product-detail.cy.ts
  - [x] TEST Shop → checkout — articolele din coș și totalurile vizibile | shop.cy.ts
  - [x] TEST Checkout guest cere email înainte de place order | checkout.cy.ts
  - [x] TEST Place order creează sesiune Stripe (mock POST) | checkout.cy.ts
  - [x] TEST Selectarea metodei de shipping actualizează totalul comenzii | checkout.cy.ts
  - [x] TEST Căutarea VAT la checkout completează automat numele firmei | checkout.cy.ts
  - [x] TEST VAT invalid blochează place order | checkout.cy.ts
  - [x] TEST Moneda RON trimite currency: ron în sesiunea de checkout | currency-eur-ron.cy.ts
  - [x] TEST /checkout/success?session_id= arată confirmarea | checkout-payment-result.cy.ts
  - [x] TEST Pagina de succes golește coșul din localStorage | checkout-payment-result.cy.ts
  - [x] TEST /checkout/cancel păstrează coșul și arată linkuri | checkout-payment-result.cy.ts

- [x] DONE FLOW Persistența coșului & badge-ul din header
  - [x] TEST Adaugă produs pe shop — coșul e stocat în localStorage | shop.cy.ts
  - [x] TEST Reload pagină — badge-ul din header și subtotalul persistă | cart-persistence.cy.ts
  - [x] TEST Șterge ultimul articol pe checkout — badge-ul din header revine la zero | cart-persistence.cy.ts
  - [x] TEST Undo readaugă articolul șters | cart-persistence.cy.ts
  - [x] TEST Iconița coșului duce la /checkout | cart-persistence.cy.ts

- [ ] FLOW Tipuri de preț & afișare taxă
  - [ ] TEST Doar tipurile 300, 500, Pallet apar (fără tipuri legacy <100)
  - [ ] TEST Tabelul de tipuri arată cu-taxă și fără-taxă în moneda selectată
  - [ ] TEST Adaugă-în-coș default folosește prețul unitar corect pentru cantitate 100
  - [ ] TEST Totalurile pe linie la checkout = preț tip × cantitate

- [ ] FLOW Tabele landing pe linii de produs
  - [x] TEST /boxesfetco — tabelul se încarcă, adauga în coș min 100, reset qty | boxesfetco.cy.ts
  - [x] TEST /corrugated-envelopes — adauga în coș din tabel → checkout arată articolul | corrugated-envelopes.cy.ts
  - [ ] TEST Secțiunile training / marketing se randează fără erori

---



## P0 — Comenzi custom B2B

- [x] DONE FLOW Configurator B2B → order-summary → submit → success
  - [x] TEST /business încarcă tipuri de cutii din API | business.cy.ts
  - [x] TEST Query params precompletează dimensiunile (?length=&width=&height=) | business.cy.ts
  - [x] TEST Validarea blochează continue fără câmpuri obligatorii | business.cy.ts
  - [x] TEST Tip carton, culoare, print, transport, cantitate, mesaj, termeni | business.cy.ts
  - [x] TEST Config valid navighează la /order-summary | business.cy.ts
  - [x] TEST Flux guest complet cu VAT RO2816464 → order success | b2b-order-success.cy.ts
  - [x] TEST Acces direct /order-summary fără draft redirecționează la /business | order-summary-guard.cy.ts
  - [ ] TEST Atașamentul de fișier pe /business e dus până la POST /api/orders
  - [ ] TEST Toggle dimensiune externă vs internă schimbă etichetele de validare
  - [ ] TEST order-summary: checkbox-urile de consimțământ (telefon/email) obligatorii
  - [ ] TEST order-summary: eșec API la submit arată mesaj de eroare
  - [x] TEST /business/order-success fără payload redirecționează la /business | b2b-order-success.cy.ts
  - [x] TEST Success guest arată CTA create-account | b2b-order-success.cy.ts
  - [x] TEST "No thanks" golește sesiunea și duce pe home | b2b-order-success.cy.ts
  - [ ] TEST Pagina de success afișează cantitate, dimensiuni, transport din payload
  - [ ] TEST Linkul de înregistrare precompletează email și VAT din success B2B

- [ ] FLOW Hero home → configurator B2B
  - [x] TEST Linkul din hero include length=400&width=400&height=400 | home-navigation.cy.ts
  - [x] TEST Click CTA hero ajunge pe /business cu query params | home-navigation.cy.ts

---



## P0 — Cont client & autentificare

- [x] DONE FLOW Login client, profil, adrese, comenzi
  - [x] TEST Vizitorul delogat vede formularul de login pe /account | account.cy.ts / login.cy.ts
  - [x] TEST Login cu credențiale valide arată tab-urile contului | account.cy.ts / login.cy.ts
  - [x] TEST Login: validare goală, 401, email normalizat, toggle parolă, localStorage | login.cy.ts
  - [x] TEST Tab My Account arată câmpurile de profil | account.cy.ts
  - [x] TEST Tab Address — adaugă, editează, șterge adresă salvată | account.cy.ts
  - [x] TEST Tab Orders listează istoricul comenzilor | account.cy.ts
  - [x] TEST Logout golește sesiunea și revine la formularul de login | account.cy.ts
  - [x] TEST Tab-urile hash #account #address #orders comută corect | account.cy.ts
  - [ ] TEST SAVE pe profil trimite PUT /api/auth/profile
  - [x] TEST Sesiunea supraviețuiește reload-ului paginii | login.cy.ts
  - [ ] TEST 401 la fetch profil arată din nou formularul de login

- [x] DONE FLOW Adrese cont ↔ shipping la checkout
  - [x] TEST Checkout fără adrese salvate arată formular manual | account-address-cart.cy.ts
  - [x] TEST Adresa shipping default salvată apare la checkout | account-address-cart.cy.ts
  - [x] TEST Toggle între adresă salvată și introducere manuală | account-address-cart.cy.ts
  - [x] TEST Adaugă adresă în cont → apare la checkout | account-address-cart.cy.ts
  - [x] TEST Șterge adresă în cont → formular manual la checkout | account-address-cart.cy.ts
  - [ ] TEST Editează adresă în cont — câmpurile actualizate la următorul checkout

- [x] DONE FLOW Înregistrare & verificare email
  - [x] TEST Validare formular înregistrare (parole diferite, email duplicat) | registration-verify.cy.ts
  - [x] TEST Înregistrare reușită arată modal de success | registration-verify.cy.ts
  - [x] TEST /verify-email?token=valid arată success | registration-verify.cy.ts
  - [x] TEST /verify-email?token=expired arată eroare | registration-verify.cy.ts
  - [x] TEST Prefill din query B2B (?email=&vatNumber=&from=b2b-order) | registration-verify.cy.ts
  - [x] TEST Checkbox termeni obligatoriu la înregistrare | registration-verify.cy.ts
  - [x] TEST Token lipsă pe /verify-email — eroare fără apel API | registration-verify.cy.ts

- [ ] FLOW Detaliu comandă & reorder
  - [ ] TEST /account/orders/[id] încarcă comanda pentru user autentificat
  - [ ] TEST Comanda B2C arată line items și detalierea prețului
  - [ ] TEST Comanda B2B arată câmpurile de config și download atașament
  - [ ] TEST "Add order to cart" populează coșul din comanda B2C
  - [ ] TEST Comandă B2B fără line items — reorder dezactivat sau mesaj informativ
  - [ ] TEST Email greșit / comandă neautorizată arată eroare

---



## P1 — Checkout & plăți (mai profund)

- [ ] FLOW Metode de shipping
  - [ ] TEST Metodele active multiple se randează cu ETA și preț
  - [ ] TEST Schimbarea metodei actualizează linia de shipping și totalul
  - [ ] TEST Metoda selectată e inclusă în payload-ul create-checkout-session
  - [ ] TEST Eșec API revine la metodele default

- [ ] FLOW Căutare VAT (comun: checkout, contact, B2B, înregistrare)
  - [x] TEST Formular contact — VAT valid acceptat, invalid respins | contact.cy.ts
  - [x] TEST B2B order-summary — VAT lookup mockat în fluxul complet | b2b-order-success.cy.ts
  - [ ] TEST Checkout — VAT RO valid completează automat firmă și adresă
  - [ ] TEST Debounce — un singur request de lookup după ce tastarea se oprește
  - [ ] TEST Eșec lookup golește câmpul firmă și arată eroare

- [ ] FLOW Editare coș la checkout
  - [ ] TEST Crește/scade cantitatea pe linie la checkout (min 100)
  - [ ] TEST Șterge linie coș — articolul dispare din totaluri
  - [ ] TEST Undo restaurează articolul șters (dacă e suportat)
  - [ ] TEST Upload atașament opțional inclus în payload-ul sesiunii
  - [ ] TEST Harta adresei se randează când adresa manuală e completă

---



## P1 — Shell global (header, footer, i18n, monedă)

- [x] DONE FLOW Limbă i18n (EN / RO / DE) | language-i18n.cy.ts — docs: documentation/language-i18n.md
  - [x] TEST Switch TopBar la RO — stringurile UI cheie se schimbă (checkout, footer)
  - [x] TEST Vizită /ro/about redirecționează la /about și setează cookie boxmag.language
  - [x] TEST Vizită /de/shop redirecționează la /shop cu traduceri germane
  - [x] TEST Limba persistă după reload

- [x] DONE FLOW Monedă EUR / RON
  - [x] TEST Switch la RON — prețurile se reformatează pe shop, PDP, checkout | currency-eur-ron.cy.ts
  - [x] TEST Modul RON apelează /api/exchange-rate/eur-ron | currency-eur-ron.cy.ts
  - [x] TEST Eșec API curs de schimb gestionat grațios | currency-eur-ron.cy.ts
  - [x] TEST Moneda persistă în localStorage după reload | currency-eur-ron.cy.ts
  - [x] TEST Checkout Place order trimite currency: ron | currency-eur-ron.cy.ts

- [ ] FLOW Navigare header & căutare
  - [ ] TEST Căutare header — tastează nume produs, dropdown leagă la PDP
  - [ ] TEST Hamburger mobil listează tipuri cutii → /shop?boxTypeId=
  - [ ] TEST Linkul Account reflectă starea logged-in vs guest
  - [ ] TEST Linkurile nav principale (Shop, Business, About, Contact) rezolvă

- [ ] FLOW Footer & newsletter
  - [ ] TEST Linkurile legale din footer rezolvă (Privacy, Regulations, Delivery etc.)
  - [ ] TEST Newsletter — email gol arată eroare de validare
  - [ ] TEST Newsletter — checkbox consimțământ lipsă e blocat
  - [ ] TEST Newsletter — submit valid POST /api/newsletter/subscribe (mock)
  - [ ] TEST Newsletter — eroare abonat duplicat e afișată

---



## P1 — Contact & formulare

- [x] DONE FLOW Formular contact
  - [x] TEST Pagina se încarcă cu câmpurile obligatorii | contact.cy.ts
  - [x] TEST Submit gol arată erori de validare pe câmpuri | contact.cy.ts
  - [x] TEST VAT invalid respins | contact.cy.ts
  - [x] TEST Checkbox termeni obligatoriu | contact.cy.ts
  - [x] TEST Submit reușit (mock API) resetează formularul | contact.cy.ts
  - [x] TEST Eroare API arată mesaj utilizatorului | contact.cy.ts
  - [ ] TEST Upload atașament fișier (multi-fișier, limită dimensiune)
  - [ ] TEST User logged-in — câmpuri precompletate din profil

---



## P1 — Admin

- [ ] FLOW Auth admin & protecție rute
  - [ ] TEST /admin neautentificat redirecționează la /admin/login?next=/admin
  - [ ] TEST Parolă greșită arată eroare în română
  - [ ] TEST Parolă corectă duce pe dashboard
  - [ ] TEST Deja logat pe /admin/login redirecționează la /admin

- [x] DONE FLOW Management comenzi admin
  - [x] TEST Tabelul de comenzi se încarcă pe /admin | admin-orders.cy.ts
  - [x] TEST Schimbă status comandă din listă | admin-orders.cy.ts
  - [x] TEST Pagina detaliu comandă se încarcă | admin-orders.cy.ts
  - [ ] TEST Detaliu comandă — config B2B vs line items B2C afișate
  - [ ] TEST Trimite email oferte — selectează sender, submit, feedback success/error
  - [ ] TEST Schimbare manuală status plată permisă pentru comenzi non-Stripe
  - [ ] TEST Schimbare status plată dezactivată pentru comenzi Stripe
  - [ ] TEST Download atașament pe detaliu comandă admin

- [ ] FLOW CRUD tipuri cutii admin
  - [x] TEST Creează tip cutie cu titlu și upload imagine | admin-box-types.cy.ts
  - [x] TEST Tipul nou apare în search header pe /shop | admin-box-types.cy.ts
  - [ ] TEST Lista arată tipuri cutii active/inactive
  - [ ] TEST Șterge sau dezactivează tip cutie
  - [ ] TEST /admin/box-types/[id]/edit încarcă metadata și produse
  - [ ] TEST Editează prețuri tip (300/500/Pallet) și salvează
  - [ ] TEST Adaugă/șterge rând produs — bulk PUT înlocuiește toate produsele
  - [ ] TEST Upload imagini suplimentare în MinIO

- [ ] FLOW CRUD metode shipping admin
  - [ ] TEST Creează metodă shipping cu nume, ETA, preț
  - [ ] TEST Editează prețul și ETA-ul metodei existente
  - [ ] TEST Toggle metodă active/inactive
  - [ ] TEST Șterge metodă shipping
  - [ ] TEST Metoda nouă apare la checkout (după refresh cache)

---



## P2 — Pagini (smoke & conținut)

- [ ] PAGE / — Home
  - [x] TEST Hero → /business cu dimensiuni | home-navigation.cy.ts
  - [ ] TEST Secțiunile hero, features, testimonials, services se randează
  - [ ] TEST CTA-urile leagă la /shop, /business, /contact
  - [ ] TEST Blocul newsletter de pe home face submit (mock API)

- [x] DONE PAGE /shop — Catalog produse
  - [x] TEST (vezi FLOW B2C mai sus)

- [x] DONE PAGE /products/[key] — Detaliu produs
  - [x] TEST (vezi FLOW B2C mai sus) | product-detail.cy.ts

- [x] DONE PAGE /checkout
  - [x] TEST (vezi FLOW B2C și checkout mai profund mai sus)

- [x] DONE PAGE /checkout/success & /checkout/cancel
  - [x] TEST (vezi FLOW B2C mai sus)

- [x] DONE PAGE /business — Configurator B2B
  - [x] TEST (vezi FLOW B2B mai sus)

- [ ] PAGE /order-summary — Review B2B
  - [x] TEST guard fără draft (vezi FLOW B2B mai sus) | order-summary-guard.cy.ts
  - [ ] TEST restul scenariilor (checkbox-uri consimțământ, eșec API la submit) — vezi FLOW B2B mai sus

- [x] DONE PAGE /business/order-success
  - [x] TEST (vezi FLOW B2B mai sus)

- [x] DONE PAGE /account
  - [x] TEST (vezi FLOW Cont client mai sus)

- [ ] PAGE /account/orders/[orderNumber]
  - [ ] TEST (vezi FLOW Detaliu comandă & reorder mai sus)

- [x] DONE PAGE /registration & /verify-email
  - [x] TEST (vezi FLOW Înregistrare mai sus)

- [x] DONE PAGE /contact
  - [x] TEST (vezi FLOW Contact mai sus)

- [ ] PAGE /about — Despre noi
  - [ ] TEST Pagina se încarcă, linkul breadcrumb home funcționează
  - [ ] TEST Secțiunile de conținut se randează în EN / RO / DE

- [ ] PAGE /boxesfetco — Linie BoxFix
  - [ ] TEST (vezi FLOW Tabele linii produs mai sus)

- [x] DONE PAGE /corrugated-envelopes — Linie plicuri
  - [x] TEST (vezi FLOW Tabele linii produs mai sus) | corrugated-envelopes.cy.ts

- [ ] PAGE /delivery — Termeni livrare
  - [ ] TEST Conținutul static se încarcă; heading-urile i18n se traduc

- [ ] PAGE /how-to-buy — Cum cumperi
  - [ ] TEST Butonul copy SWIFT copiază codul bancar în clipboard
  - [ ] TEST Secțiunea detalii bancare e vizibilă

- [ ] PAGE /privacy-policy — Confidențialitate
  - [ ] TEST Secțiunile se randează; emailurile de contact prezente

- [ ] PAGE /regulations — Termeni
  - [ ] TEST Secțiunile se randează; cross-linkuri la privacy dacă există

- [ ] PAGE /complaints-and-returns — Politică retururi
  - [ ] TEST Secțiunile se randează în toate limbile

- [ ] PAGE /admin/login
  - [ ] TEST (vezi FLOW Auth admin mai sus)

- [ ] PAGE /admin — Dashboard
  - [ ] TEST (vezi FLOW CRUD Admin mai sus)

- [x] DONE PAGE /admin/orders/[id]
  - [x] TEST (vezi FLOW Comenzi admin mai sus)

- [ ] PAGE /admin/box-types/[id]/edit
  - [ ] TEST (vezi FLOW Tipuri cutii admin mai sus)

- [ ] PAGE /mobile-app-svg — Mockup intern (prioritate mică)
  - [ ] TEST Imaginea SVG se încarcă

---



## P3 — Edge cases & reziliență

- [ ] FLOW Stări eroare API
  - [ ] TEST /shop — eșec API box-types arată eroare vizibilă utilizatorului
  - [ ] TEST /checkout — eșec API shipping-methods folosește fallback
  - [ ] TEST /business — eșec API box-types arată stare de eroare
  - [ ] TEST Vizită /checkout cu coș gol — empty state sau redirect

- [ ] FLOW Flow guards & redirecturi
  - [x] TEST /order-summary fără draft B2B → /business | order-summary-guard.cy.ts
  - [ ] TEST /business/order-success fără sesiune → /business
  - [ ] TEST /admin/* fără cookie → /admin/login

- [ ] FLOW SEO & robots (smoke)
  - [ ] TEST /sitemap.xml returnează URL-uri valide pentru produse active
  - [ ] TEST robots.txt blochează /account, /checkout/success, /admin

---

**Contorizare:** ~30 fluxuri/pagini · ~120 scenarii de test · `[x]` = deja în spec-urile Cypress
