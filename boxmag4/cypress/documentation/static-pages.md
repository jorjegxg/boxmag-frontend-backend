# Pagini statice — smoke

**Spec:** `cypress/e2e/static-pages.cy.ts`

---

## Scenarii

Pentru fiecare rută (`/about`, `/delivery`, `/how-to-buy`, `/privacy-policy`, `/regulations`, `/complaints-and-returns`):

1. Set language `en` în localStorage
2. Visit path
3. **CHECK:** `h1` cu titlul EN așteptat

---

## Rulare

```bash
npx cypress run --spec cypress/e2e/static-pages.cy.ts
```
