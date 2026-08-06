# Admin — metode de livrare

**Spec:** `cypress/e2e/admin-shipping-methods.cy.ts`  
**UI:** `boxmag4/app/admin/shipping-methods/page.tsx`

---

## Cum funcționează

| Acțiune | Efect |
|--------|--------|
| Visit pagină | `GET /api/shipping-methods?includeInactive=true` |
| Adaugă metodă | `POST /api/shipping-methods` |

---

## Scenarii Cypress

### 1. Tabel

1. `cy.loginAdmin()`, intercept GET, visit
2. **CHECK:** „Metode de livrare”, cheie + nume din mock

### 2. Creare

1. Completează câmpurile (placeholder-uri), click „Adaugă metodă de livrare”
2. **CHECK:** body POST `key`, `name`, `price`

---

## Rulare

```bash
npx cypress run --spec cypress/e2e/admin-shipping-methods.cy.ts
```
