# /boxesfetco — BoxFix product table

**Spec:** `cypress/e2e/boxesfetco.cy.ts`  
**UI:** `boxmag4/app/boxesfetco/page.tsx` + `ProductsTable` (`boxmag4/app/components/ProductTable.tsx`)  
**State:** `table_e_commerce_store` (qty per row) + `boxmag.cart` (Zustand persist)

Default `boxTypeId=1`. Min order qty: **100**. Increment step: **+20**. Reset after add: `resetAmountQty` → `defaultAmountQtyInPcs`.

---

## Cum funcționează

| Acțiune | Efect |
|--------|--------|
| Mount page | `GET /api/box-types/1/products` → populate table |
| + / − qty | `amountQtyInPcs` ±20 (floor = 100) |
| + pallet | `amountQtyInPcs` += `palletPcs` |
| Add to cart | `cart.addItem` + notification + qty reset to default (100) |

---

## Scenarii Cypress

### 1. Tabelul se încarcă

1. Mock `GET **/api/box-types/1/products` cu `BFX-001`
2. Visit `/boxesfetco` (EN, cart gol)
3. **CHECK:** itemNo + name vizibile; qty = `100`; Add to cart enabled

### 2. Add to cart → localStorage

1. Click **Add to cart** pe rândul `BFX-001`
2. **CHECK:** toast `Added 100 pcs to cart.`
3. **CHECK:** `boxmag.cart` conține `itemNo: BFX-001`, `quantity: 100`, `unitPrice: 0.45`

### 3. Reset qty după add

1. Click **Increase quantity** de 2× (100 → 140)
2. Click **Add to cart**
3. **CHECK:** cart `quantity: 140`
4. **CHECK:** UI qty revine la `100` (nu mai e `140`)

### 4. Pallet add + reset

1. Click **Add one pallet** (100 + 9000 = 9100)
2. Add to cart
3. **CHECK:** cart `quantity: 9100`
4. **CHECK:** UI qty revine la `100`

### 5. /boxesfetco → /checkout (articole corecte)

1. Add to cart (qty 100) → visit `/checkout`
2. **CHECK:** `BFX-001`, name, line total `€ 45.00` (0.45 × 100)
3. Increase qty to 140 → add → checkout
4. **CHECK:** input qty `140`, total `€ 63.00`
5. Add pallet (9100) → checkout
6. **CHECK:** input qty `9100`, total `€ 4095.00`

---

## Selectori utili

```ts
cy.contains("td", "BFX-001").closest("tr")
cy.get('button[aria-label="Increase quantity"]')
cy.get('button[aria-label="Add one pallet"]')
cy.contains("button", /Add to cart/i)
cy.contains("BFX-001").closest(".rounded-lg.border").find('input[type="number"]')
```

Storage: `boxmag.cart` → `state.items[]`.

---

## Rulare

```bash
cd boxmag4
npx cypress run --spec cypress/e2e/boxesfetco.cy.ts
```

Frontend pe `http://localhost:3006`. Mock API — backend optional pentru acest spec.
