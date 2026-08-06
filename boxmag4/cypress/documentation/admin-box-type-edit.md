# Admin — editare tip cutie

**Spec:** `cypress/e2e/admin-box-type-edit.cy.ts`  
**UI:** `boxmag4/app/admin/box-types/[id]/edit/page.tsx`  
**SoT:** `INV-TIERS` (tier-uri 300/500/Pallet în formular)

---

## Scenarii Cypress

### 1. Smoke edit form

1. `cy.loginAdmin()`
2. Intercept `GET /api/box-types` + `GET /api/box-types/3/products`
3. Visit `/admin/box-types/3/edit`
4. **CHECK:** „Editare tip cutie”, itemNo produs, buton „Salvează”

---

## Rulare

```bash
npx cypress run --spec cypress/e2e/admin-box-type-edit.cy.ts
```
