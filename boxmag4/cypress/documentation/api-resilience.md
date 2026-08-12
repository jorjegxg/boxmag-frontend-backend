# API failure resilience

**Spec:** `cypress/e2e/api-resilience.cy.ts`

---

## Cum funcționează

| Pagină | API eșuat | Expect |
|--------|-----------|--------|
| `/shop` | `GET /api/box-types` 500 | Page randează, mesaj load error |
| `/business` | `GET /api/box-types` 500 | Rămâne pe `/business`, fără crash |
| `/checkout` | `GET /api/shipping-methods` 500 | Rămâne pe `/checkout` |

## Rulare

```bash
npx cypress run --spec cypress/e2e/api-resilience.cy.ts
```
