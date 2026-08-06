# Smoke CI

**Spec:** `cypress/e2e/smoke.cy.ts`  
**SoT:** `INV-I18N-COOKIE`

---

## Scenarii

1. Home se încarcă; CTA vizibil
2. `/ro/about` → `/about` + cookie `boxmag.language=ro`

---

## Rulare

```bash
npx cypress run --spec cypress/e2e/smoke.cy.ts
```
