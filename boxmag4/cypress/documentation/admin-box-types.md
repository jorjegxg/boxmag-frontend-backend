# Admin — tipuri de cutii (creare + search shop)

**Spec:** `cypress/e2e/admin-box-types.cy.ts`  
**UI admin:** `boxmag4/app/admin/page.tsx` — secțiunea „Gestionare tipuri de cutii”  
**UI search:** `boxmag4/app/global/components/header.tsx` — `form[role="search"]` pe `/shop`  
**Auth:** `cy.loginAdmin()` → cookie `boxmag-admin-session`

Viewport ≥ `lg` (search bar `max-md:hidden`). Cypress default: 1280×800.

Necesită frontend (:3006), backend (:3005), MySQL, MinIO.

---

## Cum funcționează

| Acțiune | Efect |
|--------|--------|
| Expand „Gestionare tipuri de cutii” | `GET /api/box-types` + formular Titlu / Imagini |
| Upload + „Adaugă tip de cutie” | `POST /api/box-types/upload-images` → `POST /api/box-types` (key auto din title) |
| Row în tabel | Titlu + status `Activ` |
| Search pe `/shop` (≥2 caractere) | Filtrează tipuri active după `title`; dropdown `box_types` |

---

## Scenarii Cypress

### 1. Creează tip cutie → apare în search pe shop

1. Health check backend; skip dacă indisponibil
2. `cy.loginAdmin()`
3. Visit `/admin`, expand secțiunea tipuri cutii
4. Completează Titlu unic (`Cypress Box <timestamp>`)
5. `selectFile` pe `#box-image-upload` (`cypress/fixtures/box-type.png`)
6. Click „Adaugă tip de cutie”
7. **CHECK:** `@uploadImages` 200/201; `@createBoxType` 201
8. **CHECK:** rând tabel cu titlu + `Activ`
9. Visit `/shop`, tastează titlul în search
10. **CHECK:** link cu titlul în dropdown (`/shop?boxTypeId=…`)

---

## Selectori utili

```ts
cy.contains("button", "Gestionare tipuri de cutii")
cy.contains("label", "Titlu").find("input")
cy.get("#box-image-upload")
cy.contains("button", "Adaugă tip de cutie")
cy.get('form[role="search"] input[type="search"]')
```

Fixture: `cypress/fixtures/box-type.png`

---

## Rulare

```bash
cd boxmag4
npx cypress run --spec cypress/e2e/admin-box-types.cy.ts
```
