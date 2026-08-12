# Cont — identitate adresă din profil

**Spec:** `cypress/e2e/account-logged-in.cy.ts`, `cypress/e2e/account-address-cart.cy.ts`  
**UI:** `boxmag4/app/account/page.tsx` (`AddressTab`)  
**Invariant:** `INV-ACCOUNT-ADDRESS-IDENTITY`

---

## Cum funcționează

| Câmp | Comportament |
|------|----------------|
| Nume firmă | Read-only pe tab Address; valoare = `profile.companyName`; edit doar din Contul meu (VAT) |
| Prenume / Nume / Telefon | Prefill din profil la adresă nouă; editabile per adresă |
| Reset după Save / Cancel | Contact revine la valorile profilului; adresa stradală se golește |

---

## Scenarii Cypress

### 1. Firma read-only din profil (`account-logged-in`)

1. `visitAccountLoggedIn` (profil mock: `companyName: "Boxmag SRL"`)
2. Tab ADDRESS
3. **CHECK:** `input[placeholder="Company Name"]` value `Boxmag SRL` + atribut `readonly`
4. **CHECK:** hint „Company name is edited in My Account…”

### 2. Contact prefilled (`account-logged-in`)

1. Same setup
2. **CHECK:** First Name = `John`, Last Name = `Doe`, Phone = `799111222`

### 3. Reset după save (`account-logged-in`)

1. Completează formular, Save address
2. **CHECK:** First Name revine la `John` (nu gol)
3. **CHECK:** Address line 1 gol

### 4. Account → checkout (`account-address-cart`)

1. Salvează adresă fără a tasta Company Name (vine din profil)
2. Override First/Last/Phone cu `.clear().type(...)`
3. **CHECK:** adresa apare în `/checkout`

---

## Selectori utili

```js
cy.get('input[placeholder="Company Name"]')
cy.get('input[placeholder="First Name *"]')
cy.get('input[placeholder="Last Name *"]')
cy.get('input[placeholder="Phone"]')
cy.contains("Company name is edited in My Account, based on the VAT number.")
```

---

## Rulare

```bash
npx cypress run --spec cypress/e2e/account-logged-in.cy.ts,cypress/e2e/account-address-cart.cy.ts
```
