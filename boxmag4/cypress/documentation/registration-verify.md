# Înregistrare & verificare email

**Spec:** `cypress/e2e/registration-verify.cy.ts`  
**UI:** `/registration`, `/verify-email`, `/account#account` (profil post-login)  
**API:** `POST /api/auth/register`, `GET /api/auth/verify-email?token=`, Next.js `GET /api/vat-lookup`, `POST /api/auth/login`, `GET /api/auth/profile`  
**State:** query prefill (`email`, `firstName`, `surname`, `companyName`, `phone`, `vatNumber`, `from=b2b-order`, `returnTo`)

Dev mode pre-completează formularul (email demo, VAT, parole). Testele mock-uiesc VAT + register (+ login/profile pentru assert pe cont).

---

## Cum funcționează

| Acțiune | Efect |
|--------|--------|
| Tastează VAT valid | debounce 600ms → `GET /api/vat-lookup` → `#reg-company` read-only |
| VAT invalid / lookup fail | golește company + mesaj eroare |
| Submit fără termeni | eroare: accept Regulations / Privacy Policy |
| Parole diferite | eroare: Passwords do not match |
| Register OK | modal „Registration Successful” + email + link `returnTo` (default `/account#orders`) |
| Login după register | `GET /api/auth/profile` populează `#acc-first` … `#acc-company` + email (read-only) |
| `?from=b2b-order&email=` | email locked (readonly); copy B2B |
| `/verify-email?token=` valid | success + Go to Sign In |
| token invalid / expired | eroare + Register Again |
| fără `token` | eroare locală, **fără** apel API |

---

## Scenarii Cypress

### 1. Formularul se randează

1. Visit `/registration` (VAT mock)
2. **CHECK:** heading Registration; câmpuri `#reg-vat` … `#reg-accept`
3. **CHECK:** `#reg-company` readonly; link Sign in → `/account`

### 2. Înregistrare reușită

1. Mock `POST **/api/auth/register` → 201 `{ ok: true }`
2. Completează formularul (VAT → wait lookup → restul)
3. Click Register
4. **CHECK:** body include `email`, `firstName`, `surname`, `phone`, `vatNumber`, `companyName`, `acceptRegulations: true`
5. **CHECK:** modal Confirmation; email afișat; Back to login → `/account#orders`

### 3. Datele din registration apar pe profil

1. Register cu date distincte (`Elena` / `Ionescu` / VAT / phone / company)
2. Mock login + `GET /api/auth/profile` cu aceleași valori (`surname` → `lastName`)
3. Visit `/account#account` → Sign in
4. **CHECK:** `#acc-first` = firstName; `#acc-last` = surname; `#acc-phone` = phone
5. **CHECK:** `#acc-vat` = vatNumber; `#acc-company` = companyName; `#acc-email` = email (readonly)

### 4. Parole diferite

1. Fill form cu confirm ≠ password
2. **CHECK:** `Passwords do not match.`

### 5. Checkbox termeni obligatoriu

1. Fill form, uncheck `#reg-accept`
2. **CHECK:** `You must accept the Regulations and Privacy Policy.`

### 6. Email duplicat (API 409)

1. Mock register → 409 + mesaj
2. **CHECK:** mesajul backend apare în UI

### 7. VAT lookup

1. Type VAT pe `#reg-vat`
2. **CHECK:** wait `@vatLookup`; `#reg-company` = mock company

### 8. Prefill B2B

1. Visit cu query `from=b2b-order&email=&vatNumber=&…&returnTo=/account#orders`
2. **CHECK:** copy B2B; email readonly + valoare; restul precompletat
3. Register mock OK → Back to login href = `returnTo`

### 9. Verify email — token valid

1. Intercept verify 200 HTML
2. Visit `/verify-email?token=valid-token`
3. **CHECK:** Email verified; Go to Sign In → `/account`

### 10. Verify email — token invalid

1. Intercept verify 400
2. **CHECK:** Verification failed; Register Again → `/registration`

### 11. Verify email — token lipsă

1. Intercept spy pe `**/api/auth/verify-email*`
2. Visit `/verify-email` (fără token)
3. **CHECK:** `Invalid verification link.`; API **nu** e apelat

---

## Selectori utili

```ts
cy.get("#reg-vat")
cy.get("#reg-company")   // readonly, auto din VAT
cy.get("#reg-email")
cy.get("#reg-password")
cy.get("#reg-confirm")
cy.get("#reg-firstName")
cy.get("#reg-surname")
cy.get("#reg-phone")
cy.get("#reg-accept")
cy.contains("button", "Register")
cy.contains("Registration Successful")
cy.contains("a", "Back to login")

// profil /account#account
cy.get("#acc-first")
cy.get("#acc-last")
cy.get("#acc-phone")
cy.get("#acc-vat")
cy.get("#acc-company")
```

---

## Rulare

```bash
cd boxmag4
npx cypress run --spec cypress/e2e/registration-verify.cy.ts
```

Frontend pe `:3006`. Spec-ul mock-uiește VAT + register + verify (+ login/profile) — nu depinde de DB / SMTP.
