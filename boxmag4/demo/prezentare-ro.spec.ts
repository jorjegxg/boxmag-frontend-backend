import { expect, test, type Page, type Route } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * Walkthrough video de prezentare (RO).
 * Nu e suită de regresii — pauze vizibile + mock-uri API ca să meargă fără backend.
 */

const MOCK_BOX_TYPES = [
  {
    id: 1,
    title: "Standard Boxes",
    key: "standard",
    images: [
      {
        id: 11,
        url: "/b2b/boxes/box.png",
        sortOrder: 1,
        altText: null,
        isPrimary: true,
      },
    ],
    isActive: true,
  },
  {
    id: 3,
    title: "Custom Mailers",
    key: "mailers",
    images: [
      {
        id: 33,
        url: "/b2b/boxes/box.png",
        sortOrder: 1,
        altText: null,
        isPrimary: true,
      },
    ],
    isActive: true,
  },
];

const MOCK_PRODUCTS: Record<number, unknown[]> = {
  1: [
    {
      id: 101,
      boxTypeId: 1,
      itemNo: "STD-001",
      productName: "Standard Box 300x200",
      internalDimensionsMM: { l: 300, w: 200, h: 150 },
      qualityCardboard: "BC",
      palletDimensionsCM: { l: 120, w: 80, h: 100 },
      weightPieceGr: 100,
      weightPalletKg: 200,
      amountQtyInPcs: 100,
      palletPcs: 9000,
      prices: [
        { id: 1, name: "300", withoutTax: 10, withTax: 12.1 },
        { id: 2, name: "500", withoutTax: 9, withTax: 10.89 },
        { id: 3, name: "Pallet", withoutTax: 8, withTax: 9.68 },
      ],
    },
    {
      id: 102,
      boxTypeId: 1,
      itemNo: "STD-002",
      productName: "Standard Box 400x300",
      prices: [
        { id: 4, name: "300", withoutTax: 12, withTax: 14.52 },
        { id: 5, name: "500", withoutTax: 11, withTax: 13.31 },
        { id: 6, name: "Pallet", withoutTax: 10, withTax: 12.1 },
      ],
    },
  ],
  3: [
    {
      id: 301,
      boxTypeId: 3,
      itemNo: "MLR-001",
      productName: "Mailer 250x180",
      prices: [
        { id: 7, name: "300", withoutTax: 5, withTax: 6.05 },
        { id: 8, name: "500", withoutTax: 4.5, withTax: 5.445 },
        { id: 9, name: "Pallet", withoutTax: 4, withTax: 4.84 },
      ],
    },
  ],
};

const MOCK_SHIPPING = [
  {
    id: 0,
    key: "own-transport",
    name: "Transport propriu",
    etaText: "Ridicare depozit",
    price: 0,
    isActive: true,
    sortOrder: 0,
  },
  {
    id: 1,
    key: "standard",
    name: "Livrare standard",
    etaText: "Estimat 7-10 zile",
    price: 25,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 2,
    key: "express",
    name: "Livrare express",
    etaText: "Estimat 2-4 zile",
    price: 40,
    isActive: true,
    sortOrder: 2,
  },
];

async function pause(page: Page, ms = 1200) {
  await page.waitForTimeout(ms);
}

async function setRomanian(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("boxmag.language", "ro");
    document.cookie = "boxmag.language=ro; path=/; max-age=31536000; samesite=lax";
  });
  await page.context().addCookies([
    {
      name: "boxmag.language",
      value: "ro",
      url: process.env.DEMO_BASE_URL ?? "http://localhost:3006",
    },
  ]);
}

async function installDemoMocks(page: Page) {
  await page.route("**/api/box-types", async (route: Route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, data: MOCK_BOX_TYPES }),
    });
  });

  await page.route("**/api/box-types/*/products**", async (route: Route) => {
    const url = route.request().url();
    const match = url.match(/\/api\/box-types\/(\d+)\/products/);
    const boxTypeId = match ? Number(match[1]) : NaN;
    const data = Number.isFinite(boxTypeId) ? MOCK_PRODUCTS[boxTypeId] ?? [] : [];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, data }),
    });
  });

  await page.route("**/api/shipping-methods**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, data: MOCK_SHIPPING }),
    });
  });

  await page.route("**/api/vat-lookup**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        companyName: "Boxmag SRL",
        vatNumber: "RO12345678",
      }),
    });
  });

  await page.route("**/api/payments/create-checkout-session**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          sessionId: "cs_demo_prezentare",
          url: "https://checkout.stripe.com/c/pay/cs_demo_prezentare",
        },
      }),
    });
  });

  await page.route("**/api/auth/profile**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          firstName: "Ana",
          lastName: "Popescu",
          phone: "799111222",
          email: "demo@boxmag.eu",
          companyName: "Boxmag SRL",
          vatNumber: "RO12345678",
        },
      }),
    });
  });

  await page.route("**/api/addresses**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, data: [] }),
    });
  });

  await page.route("**/api/orders**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, data: [] }),
    });
  });

  await page.route("**/api/newsletter/**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

async function selectBusinessCard(page: Page, sectionId: string, label: string) {
  const card = page.locator(`#${sectionId}`).locator('[role="button"]').filter({
    hasText: label,
  });
  await card.first().scrollIntoViewIfNeeded();
  await card.first().click();
  await pause(page, 700);
}

async function clickOutlinedOption(page: Page, sectionId: string, label: RegExp | string) {
  const section = page.locator(`#${sectionId}`);
  await section.scrollIntoViewIfNeeded();
  await section.getByRole("button", { name: label }).first().click();
  await pause(page, 500);
}

test.describe.configure({ mode: "serial" });

test("prezentare Boxmag RO", async ({ page }, testInfo) => {
  test.setTimeout(10 * 60 * 1000);

  await setRomanian(page);
  await installDemoMocks(page);

  // --- Home ---
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Cutii de livrare/i })).toBeVisible();
  await pause(page, 1800);
  await page.evaluate(() => window.scrollBy(0, 400));
  await pause(page, 1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await pause(page, 800);

  const heroCta = page.getByRole("link", { name: /ÎNCEPE/i }).first();
  await expect(heroCta).toBeVisible();
  await pause(page, 1000);

  // --- Shop ---
  await page.goto("/shop");
  await expect(page.getByText("Standard Box 300x200")).toBeVisible({ timeout: 20_000 });
  await pause(page, 1500);
  await page.getByText("Standard Box 300x200").click();
  await expect(page).toHaveURL(/\/products\/standard/);
  await pause(page, 1500);

  // --- PDP ---
  await expect(page.getByText(/300|Pallet|Palet/i).first()).toBeVisible();
  await pause(page, 1200);
  await page.getByRole("button", { name: /Adaugă în coș/i }).click();
  await pause(page, 1500);

  // --- Checkout (form only; Stripe mocked / no redirect follow) ---
  await page.goto("/checkout");
  await expect(page.getByText("STD-001")).toBeVisible({ timeout: 20_000 });
  await pause(page, 1200);

  await page.getByPlaceholder("Adresă de email").fill("demo.guest@boxmag.eu");
  await page.locator("#checkout-vatNumber").fill("RO12345678");
  await expect(page.locator("#checkout-companyName")).not.toHaveValue("", {
    timeout: 15_000,
  });
  await pause(page, 800);

  await page.getByPlaceholder("Prenume").fill("Elena");
  await page.getByPlaceholder("Nume", { exact: true }).fill("Marin");
  await page.getByPlaceholder("Adresă (linia 1)").fill("Str. Demo 7");
  await page.getByPlaceholder("Cod poștal").fill("725400");
  await page.getByPlaceholder("Oraș").fill("Rădăuți");
  await page.getByPlaceholder("Țară").fill("RO");
  await page.getByPlaceholder("Telefon").fill("799888777");
  await pause(page, 1000);

  const placeOrder = page.getByRole("button", { name: /Plasează comanda/i });
  await expect(placeOrder).toBeVisible();
  await placeOrder.scrollIntoViewIfNeeded();
  await pause(page, 2000);
  // Nu urmărim Stripe Checkout real — butonul rămâne vizibil pentru prezentare.

  // --- B2B configurator ---
  await page.goto("/business");
  await expect(page.getByText(/Selectează tipul cutiei/i)).toBeVisible({
    timeout: 20_000,
  });
  await pause(page, 1200);

  await selectBusinessCard(page, "section-box-type-cards", "Standard Boxes");
  await selectBusinessCard(page, "section-cardboard-type-cards", "B Wave");
  await selectBusinessCard(page, "section-cardboard-color-cards", "Maro pe ambele");

  await clickOutlinedOption(page, "section-box-print-cards", /Fără culoare/i);
  await clickOutlinedOption(page, "section-size-type-cards", /Dimensiune internă/i);
  await page.locator("#section-transport").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /Transport propriu/i }).first().click();
  await pause(page, 500);

  await page.locator("#package-length").fill("400");
  await page.locator("#package-width").fill("300");
  await page.locator("#package-height").fill("200");
  await page.locator("#boxes-quantity").fill("500");
  await page.getByPlaceholder(/Introdu mesajul aici/i).fill(
    "Cerere demo prezentare Boxmag.",
  );
  const terms = page.locator("#terms-checkbox-basic");
  if ((await terms.getAttribute("aria-checked")) !== "true") {
    await terms.click({ force: true });
  }
  await pause(page, 1200);

  await page.getByRole("button", { name: /ÎNAINTE/i }).click();
  await expect(page).toHaveURL(/\/order-summary/, { timeout: 20_000 });
  await pause(page, 2000);

  // --- Account shell ---
  await page.goto("/account");
  await expect(page.getByText(/Autentificare|CONTUL MEU|email/i).first()).toBeVisible();
  await pause(page, 2000);

  // Copy friendly video name after browser closes video file
  const video = page.video();
  await page.close();
  if (video) {
    const src = await video.path();
    const destDir = path.join(testInfo.project.outputDir, "..");
    fs.mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, "boxmag-prezentare-ro.webm");
    if (src && fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      // eslint-disable-next-line no-console
      console.log(`[demo] Video salvat: ${dest}`);
    }
  }
});
