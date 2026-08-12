# Order summary — edge cases

**Spec:** `cypress/e2e/order-summary-edges.cy.ts`  
**UI:** `/business` → `/order-summary`

---

## Cum funcționează

| Acțiune | Efect |
|--------|--------|
| Consent phone/email unchecked | Blochează submit, mesaj eroare |
| `POST /api/orders` 500 | Rămâne pe `/order-summary`, mesaj eroare |
| Fișier pe `/business` | Ajunge în body ca `attachmentName` + base64 |

---

## Scenarii Cypress

### 1. Consent obligatoriu

1. Completează configurator + contact
2. Uncheck ambele consent checkbox-uri
3. Click NEXT
4. **CHECK:** „Please accept phone consent before sending.”

### 2. API fail

1. Intercept POST 500
2. Click NEXT
3. **CHECK:** pathname tot `/order-summary`, text eroare

### 3. Attachment în payload

1. Upload `specs.pdf` pe `/business`
2. **CHECK:** `attachment-reading` dispare; NEXT enabled
3. Submit pe order-summary
4. **CHECK:** body conține `attachmentName`, `attachmentBase64`, mime pdf

## Rulare

```bash
npx cypress run --spec cypress/e2e/order-summary-edges.cy.ts
```
