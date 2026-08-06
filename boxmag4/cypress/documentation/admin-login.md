# Admin — login + middleware

**Spec:** `cypress/e2e/admin-login.cy.ts`  
**UI:** `boxmag4/app/admin/login/page.tsx`  
**SoT:** `INV-AUTH-ADMIN`

---

## Cum funcționează

| Acțiune | Efect |
|--------|--------|
| Visit `/admin/*` fără cookie | Redirect `/admin/login?next=…` |
| POST `/api/admin/auth` OK | Cookie `boxmag-admin-session` |
| Parolă greșită | 401 + mesaj pe formular |

---

## Scenarii Cypress

### 1. Redirect neautentificat

1. Clear cookies, visit `/admin/orders`
2. **CHECK:** pathname `/admin/login`, query `next=`, titlu „Acces admin”

### 2. Parolă greșită

1. Intercept POST `/api/admin/auth` → 401
2. Completează formular, submit
3. **CHECK:** mesaj „Parolă incorectă”, rămâne pe login

### 3. Login reușit

1. `cy.loginAdmin()`
2. Visit `/admin` (redirect → `/admin/orders`)
3. **CHECK:** zonă admin vizibilă (ex. „Comenzi”)

---

## Selectori utili

```ts
cy.get("#admin-password")
cy.contains("button", "Autentificare")
cy.contains("h1", "Acces admin")
```

## Rulare

```bash
npx cypress run --spec cypress/e2e/admin-login.cy.ts
```
