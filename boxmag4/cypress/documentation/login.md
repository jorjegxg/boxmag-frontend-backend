# Login client (`LoginRequiredView`)

**Spec:** `cypress/e2e/login.cy.ts`  
**UI:** `/account` — `LoginRequiredView` în `boxmag4/app/account/page.tsx`  
**API:** `POST /api/auth/login` (backend), apoi `GET /api/auth/profile`, `GET /api/addresses`, `GET /api/orders`  
**State:** `localStorage` `boxmag.auth.loggedIn` + `boxmag.auth.email`; cookie sesiune backend

Guest pe `/account` vede formularul Sign in (fără middleware redirect).

---

## Cum funcționează

| Acțiune | Efect |
|--------|--------|
| Submit fără email/parolă | eroare: `Please enter your email and password.` |
| `POST /api/auth/login` 401 / `ok: false` | mesaj din `payload.message` (ex. Invalid email or password); fără localStorage |
| Login OK | `localStorage` setat; `AUTH_CHANGED_EVENT`; tab-uri MY ACCOUNT / ADDRESS / ORDERS |
| Email la submit | `trim().toLowerCase()` înainte de POST |
| Toggle ochi | `#account-login-password` `type` password ↔ text |
| Link Register | `/registration` |

---

## Scenarii Cypress

### 1. Formular guest

1. `cy.visitAccountLoggedOut()` → `/account`
2. **CHECK:** `h2` Sign in; `#account-login-email`; `#account-login-password`; buton Sign in
3. **CHECK:** fără buton MY ACCOUNT

### 2. Link Register

1. **CHECK:** `a[href="/registration"]` există

### 3. Validare câmpuri goale

1. Clear email + password; `novalidate` pe form
2. Click Sign in
3. **CHECK:** `Please enter your email and password.`

### 4. Credențiale invalide

1. Mock `POST **/api/auth/login` → 401
2. Fill + Sign in
3. **CHECK:** mesaj eroare; localStorage auth gol

### 5. Email normalizat

1. Mock login 200
2. Type `  Test@Example.COM  `
3. **CHECK:** `request.body.email === "test@example.com"`

### 6. Login reușit

1. Mock login 200 + `mockAccountApis()`
2. Fill `TEST_EMAIL` + password → Sign in
3. **CHECK:** `boxmag.auth.loggedIn = true`, email setat
4. **CHECK:** fără Sign in; tab-uri + `#acc-first` = John

### 7. Toggle parolă

1. **CHECK:** type password → Show → text → Hide → password

### 8. Persist după reload

1. Login OK
2. Reload
3. **CHECK:** tot logat (MY ACCOUNT, profil)

---

## Selectori utili

```ts
cy.get("#account-login-email")
cy.get("#account-login-password")
cy.contains("button", "Sign in")
cy.get('button[aria-label="Show password"]')
cy.get('a[href="/registration"]')
```

Storage: `boxmag.auth.loggedIn` = `"true"`; `boxmag.auth.email`.

Helpers: `cy.visitAccountLoggedOut()`, `cy.mockAccountApis()`, `TEST_EMAIL`.

---

## Rulare

```bash
cd boxmag4
npx cypress run --spec cypress/e2e/login.cy.ts
```

Frontend pe `:3006`. Spec mock-uiește login + profile/addresses/orders — nu depinde de user DB real.
