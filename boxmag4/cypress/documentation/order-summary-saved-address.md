# Order summary – saved address (logged-in B2B)

**Spec:** `cypress/e2e/order-summary-saved-address.cy.ts`  
**UI/State:** `boxmag.auth.*` + `GET /api/addresses` / `GET /api/auth/profile` pe `/order-summary`  
**SoT:** `INV-B2B-SAVED-ADDRESS`

## Cum funcționează

| Pas | Comportament |
|-----|----------------|
| User logat cu adrese | Load profile + addresses; `addressType=company`; preview adresă default shipping |
| Toggle „Folosește altă adresă” | Formular manual address/postcode/city/country |
| Toggle „Folosește adresa salvată” | Revine la preview + default shipping id |
| Submit company mode | `POST /api/orders` cu address din `selectedAddress` |
| Guest / fără adrese | Formular manual (fără toggle) |

## Scenarii Cypress

1. Configurator B2B → `/order-summary` logat cu `sampleWarehouseAddress`
2. **CHECK:** preview salvat (`os-saved-address-preview`), fără `#os-address`
3. **CHECK:** `POST /api/orders` body = Str. Depozit 15, Hala B / 725400 / Radauti / RO
4. Toggle altă adresă → completează manual
5. **CHECK:** payload folosește adresa manuală

## Selectori utili

- `[data-testid="os-saved-address-preview"]`
- `[data-testid="os-use-another-address"]` / `[data-testid="os-use-saved-address"]`
- `#os-address`, `#os-postcode`, `#os-city`, `#os-country`

## Rulare

```bash
cd boxmag4
npx cypress run --spec cypress/e2e/order-summary-saved-address.cy.ts --browser chrome
```
