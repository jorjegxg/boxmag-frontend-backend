# B2B — Guest integration (manual)

Scenarii manuale pentru fluxul B2B ca guest. Auth: **Guest** (neautentificat).

**Înainte de Cypress:** DB se resetează automat la start (`reset_and_seed.sql` + MinIO). Dezactivare: `CYPRESS_RESET_DB=false`. Manual: `npm run db:reset` din `boxmag4/`.

## Date comune

| Câmp      | Valoare                 |
| --------- | ----------------------- |
| Email     | `yotrevorgxg@gmail.com` |
| CUI / VAT | `RO2816464`             |
| Parolă (test 2) | alege o parolă sigură (ex. `TestPass123!`) |

> Pentru testul 2, folosește un email **fără cont existent**. Poți refolosi același email dacă testul 1 nu a creat cont.

---

## Test 1 — `b2b-guest-integration` (fără cont)

**Automat:** `cypress/e2e/b2b-guest-integration.cy.ts`

Guest plasează comanda B2B și refuză crearea contului pe pagina de success.

### DO — Plasare comandă

- [ ] Deschide fluxul B2B ca guest (fără login)
- [ ] Completează configuratorul și order-summary cu datele de mai sus
- [ ] Trimite comanda
- [ ] Pe `/business/order-success`, apasă **No, thanks** (sau echivalent — nu crea cont)

### CHECK — Admin → Comenzi

- [ ] Comanda apare în lista **Comenzi**
- [ ] Informațiile din tabel sunt corecte
- [ ] Status: **Nouă**
- [ ] Răspuns: **Așteaptă răspuns**

### DO — Detaliu comandă

- [ ] Click pe comanda din listă

### CHECK — Pagina de detaliu + email

- [ ] Informațiile de pe pagină sunt corecte
- [ ] Verifică inbox-ul `yotrevorgxg@gmail.com` — email de confirmare comandă primit

---

## Test 2 — `b2b-guest-create-account` (cont pe success)

**Automat:** `cypress/e2e/b2b-guest-create-account.cy.ts`

Guest plasează comanda B2B, apoi creează cont din pagina de success.

### DO — Plasare comandă

- [ ] Deschide fluxul B2B ca guest (fără login)
- [ ] Completează configuratorul și order-summary cu datele de mai sus
- [ ] Trimite comanda
- [ ] Pe `/business/order-success`, apasă **Create a free account**

### CHECK — Înregistrare

- [ ] Ești redirecționat la `/registration?from=b2b-order&...`
- [ ] Câmpurile sunt precompletate: email, nume, firmă, VAT, telefon
- [ ] Email-ul este blocat (nu poate fi schimbat)
- [ ] Completează parola + confirmare parolă
- [ ] Bifează termenii și apasă **Register**
- [ ] Apare mesajul de succes — verifică email pentru link de confirmare

### DO — Verificare email + login

- [ ] Deschide linkul de verificare din email
- [ ] Mergi la `/account#orders` și autentifică-te cu email + parola setată

### CHECK — Cont client → ORDERS

- [ ] Tab-ul **ORDERS** arată comanda B2B tocmai plasată
- [ ] Status în listă: **NEW**
- [ ] Click pe comandă → pagina de detaliu se deschide
- [ ] Items: tip cutie, cantitate, carton, culoare, print — corecte
- [ ] Shipping Address: nume, firmă, oraș, țară, telefon, email — corecte
- [ ] Order Metadata: transport + dimensiuni — corecte
- [ ] Customer Message — corect

### CHECK — Admin → Comenzi

- [ ] Comanda apare în lista **Comenzi**
- [ ] Informațiile din tabel sunt corecte
- [ ] Status: **Nouă**
- [ ] Răspuns: **Așteaptă răspuns**

### DO — Detaliu comandă (admin)

- [ ] Click pe comanda din listă

### CHECK — Pagina de detaliu + email

- [ ] Informațiile de pe pagină sunt corecte
- [ ] Verifică inbox-ul — email de confirmare comandă primit (la plasare)
- [ ] Verifică inbox-ul — email de verificare cont primit (la înregistrare)
