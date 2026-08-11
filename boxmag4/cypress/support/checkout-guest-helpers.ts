import {
  AUTH_EMAIL_STORAGE_KEY,
  AUTH_STORAGE_KEY,
  CART_STORAGE_KEY,
  MOCK_SHIPPING_METHODS,
  SHIPPING_METHODS_CACHE_KEY,
} from "./commands";

export const GUEST_EMAIL = "cypress.checkout.guest@example.com";
export const FIRST_NAME = "Elena";
export const SURNAME = "Marin";
export const CUSTOMER_NAME = `${FIRST_NAME} ${SURNAME}`;
export const COMPANY_NAME = "Guest Checkout SRL";
export const VAT_NUMBER = "RO12345678";
export const PHONE = "799888777";
export const ADDRESS = "Str. Test 7";
export const POSTCODE = "725400";
export const CITY = "Radauti";
export const COUNTRY = "RO";
export const ACCOUNT_PASSWORD = "TestPass123!";
export const VERIFICATION_TOKEN = "cypress-checkout-email-verify-token";
export const PRODUCT_ITEM_NO = "BOX-001";
export const PRODUCT_NAME = "Custom Box 300x200";
export const PRODUCT_UNIT_PRICE = 12.5;
export const PRODUCT_QTY = 100;
export const SHIPPING = MOCK_SHIPPING_METHODS.find((m) => m.key === "standard")!;
export const VAT_PERCENT = 21;

export const BACKEND_URL = (
  Cypress.env("backendUrl") as string | undefined
)?.replace(/\/$/, "") ?? "http://localhost:3005";

export type CheckoutCartItem = {
  itemNo: string;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
};

export const DEFAULT_CART_ITEM: CheckoutCartItem = {
  itemNo: PRODUCT_ITEM_NO,
  name: PRODUCT_NAME,
  unitPrice: PRODUCT_UNIT_PRICE,
  quantity: PRODUCT_QTY,
  imageUrl: "/b2b/boxes/box.png",
};

export const setupCheckoutGuestSession = () => {
  cy.window().then((win) => {
    win.localStorage.removeItem(AUTH_STORAGE_KEY);
    win.localStorage.removeItem(AUTH_EMAIL_STORAGE_KEY);
    win.localStorage.removeItem(SHIPPING_METHODS_CACHE_KEY);
  });
};

export const routeLocalBackend = () => {
  cy.intercept("https://api.boxmag.eu/api/**", (req) => {
    req.url = req.url.replace(
      "https://api.boxmag.eu",
      BACKEND_URL || "http://localhost:3005",
    );
  });
};

export const stubVatLookup = () => {
  cy.intercept("GET", "**/api/vat-lookup*", {
    statusCode: 200,
    body: {
      ok: true,
      companyName: COMPANY_NAME,
      vatNumber: VAT_NUMBER,
    },
  }).as("vatLookupCheckout");
};

export const stubShippingMethods = () => {
  cy.intercept("GET", "**/api/shipping-methods", {
    statusCode: 200,
    body: {
      ok: true,
      data: MOCK_SHIPPING_METHODS,
    },
  }).as("getShippingMethods");
};

export type PaidCheckoutSession = {
  orderId: number;
  orderNumber: string;
  sessionId: string;
  totalAmountCents: number;
};

export const stubCheckoutPaymentApis = (result: PaidCheckoutSession) => {
  cy.intercept("GET", "**/api/payments/sessions/*", (req) => {
    if (!req.url.includes(result.sessionId)) {
      req.continue();
      return;
    }

    req.reply({
      statusCode: 200,
      body: {
        ok: true,
        data: {
          sessionId: result.sessionId,
          paymentStatus: "paid",
          customerEmail: GUEST_EMAIL,
          order: {
            id: result.orderId,
            orderNumber: result.orderNumber,
          },
        },
      },
    });
  }).as("getSessionGuestCreate");

  cy.intercept("POST", "**/api/payments/create-checkout-session", (req) => {
    expect(req.body.email).to.eq(GUEST_EMAIL);
    expect(req.body.vatNumber).to.eq(VAT_NUMBER);
    expect(req.body.address?.firstName).to.eq(FIRST_NAME);
    expect(req.body.address?.lastName).to.eq(SURNAME);
    expect(req.body.cartItems?.[0]?.itemNo).to.eq(PRODUCT_ITEM_NO);
    expect(req.body.cartItems?.[0]?.quantity).to.eq(PRODUCT_QTY);

    req.reply({
      statusCode: 200,
      body: {
        ok: true,
        data: {
          orderId: result.orderId,
          sessionId: result.sessionId,
          url: `/checkout/success?session_id=${result.sessionId}`,
        },
      },
    });
  }).as("createCheckoutGuest");
};

export const seedPaidCheckoutOrder = () =>
  cy.task("createPaidCheckoutOrder", {
    email: GUEST_EMAIL,
    firstName: FIRST_NAME,
    lastName: SURNAME,
    companyName: COMPANY_NAME,
    vatNumber: VAT_NUMBER,
    phone: PHONE,
    address: ADDRESS,
    postcode: POSTCODE,
    city: CITY,
    country: COUNTRY,
    shippingName: SHIPPING.name,
    shippingEta: SHIPPING.etaText,
    shippingPrice: SHIPPING.price,
    vatPercent: VAT_PERCENT,
    currency: "eur",
    cartItems: [DEFAULT_CART_ITEM],
  }) as Cypress.Chainable<PaidCheckoutSession>;

export const visitCheckoutWithCart = (
  cartItem: CheckoutCartItem = DEFAULT_CART_ITEM,
) => {
  const totalItems = cartItem.quantity;
  const subtotal = cartItem.unitPrice * cartItem.quantity;

  cy.visit("/checkout", {
    onBeforeLoad(win) {
      win.localStorage.setItem("boxmag.language", "en");
      win.localStorage.removeItem(AUTH_STORAGE_KEY);
      win.localStorage.removeItem(AUTH_EMAIL_STORAGE_KEY);
      win.localStorage.removeItem(SHIPPING_METHODS_CACHE_KEY);
      win.localStorage.removeItem("boxmag.vatCompanyCache.v1");
      win.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({
          state: {
            items: [cartItem],
            newCartItems: totalItems,
            subtotal,
            totalItems,
          },
          version: 0,
        }),
      );
    },
  });
  cy.wait("@getShippingMethods");
};

export const fillGuestCheckoutForm = () => {
  cy.get('input[placeholder="Email address"]').clear().type(GUEST_EMAIL);
  cy.get('input[placeholder="First name"]').clear().type(FIRST_NAME);
  cy.get('input[placeholder="Last name"]').clear().type(SURNAME);
  cy.get('input[placeholder="Address line 1"]').clear().type(ADDRESS);
  cy.get('input[placeholder="Postcode"]').clear().type(POSTCODE);
  cy.get('input[placeholder="City"]').clear().type(CITY);
  cy.get('input[placeholder="Country"]').clear().type(COUNTRY);
  cy.get('input[placeholder="Phone"]').clear().type(PHONE);

  cy.window().then((win) => {
    win.localStorage.removeItem("boxmag.vatCompanyCache.v1");
  });
  cy.get("#checkout-vatNumber").clear().type(VAT_NUMBER, { delay: 0 });
  cy.wait("@vatLookupCheckout", { timeout: 15000 });
  cy.get("#checkout-companyName", { timeout: 15000 }).should(
    "have.value",
    COMPANY_NAME,
  );
};

export const placeGuestCheckoutOrder = () => {
  stubVatLookup();
  stubShippingMethods();
  visitCheckoutWithCart();
  fillGuestCheckoutForm();

  seedPaidCheckoutOrder().then((result) => {
    cy.wrap(result.orderId).as("orderId");
    cy.wrap(result.orderNumber).as("orderNumber");
    cy.wrap(result.sessionId).as("sessionId");
    cy.wrap(result.totalAmountCents).as("totalAmountCents");
    stubCheckoutPaymentApis(result);
  });

  cy.contains("button", "Place order").click();
  cy.wait("@createCheckoutGuest");

  cy.location("pathname", { timeout: 15000 }).should("eq", "/checkout/success");
  cy.wait("@getSessionGuestCreate");

  cy.contains("Thank you! Payment received.").should("exist");
  cy.get<string>("@orderNumber").then((orderNumber) => {
    cy.contains(orderNumber).should("exist");
  });
  cy.contains("Create a free account").should("exist");
  cy.contains("View my orders").should("not.exist");
};

export const assertCustomerCheckoutOrdersList = (orderNumber: string) => {
  cy.contains("h2", "ORDERS").should("exist");
  cy.contains("No orders found.").should("not.exist");
  cy.contains("a", orderNumber).should("exist").closest("a").within(() => {
    cy.contains(orderNumber).should("exist");
    cy.contains("NEW").should("exist");
  });
};

export const assertCustomerCheckoutOrderDetail = (orderNumber: string) => {
  cy.contains("Order Details").should("exist");
  cy.contains(`Order Number #${orderNumber}`).should("exist");
  cy.contains("NEW").should("exist");
  cy.contains("PAID").should("exist");

  cy.contains("Items").should("exist");
  cy.contains(PRODUCT_ITEM_NO).should("exist");
  cy.contains(PRODUCT_NAME).should("exist");
  cy.contains(`${PRODUCT_QTY} ×`).should("exist");

  cy.contains("Shipping Address").should("exist");
  cy.contains(CUSTOMER_NAME).should("exist");
  cy.contains(COMPANY_NAME).should("exist");
  cy.contains(CITY).should("exist");
  cy.contains(COUNTRY).should("exist");
  cy.contains(PHONE).should("exist");
  cy.contains(GUEST_EMAIL).should("exist");
};

export const assertAdminCheckoutOrderRow = (orderNumber: string) => {
  cy.contains("Comenzi").should("exist");
  cy.contains("tr", orderNumber).within(() => {
    cy.contains(orderNumber).should("exist");
    cy.contains(CUSTOMER_NAME).should("exist");
    cy.contains(COMPANY_NAME).should("exist");
    cy.contains("Checkout Cart Order").should("exist");
    cy.contains(String(PRODUCT_QTY)).should("exist");
    cy.contains("—").should("exist");
    cy.contains(/plătită/i).should("exist");
    cy.get("select").should("have.value", "new");
  });
};

export const assertAdminCheckoutOrderDetail = (orderNumber: string) => {
  cy.contains("Detalii comandă").should("exist");
  cy.contains("h2", orderNumber).should("exist");
  cy.contains("Nouă").should("exist");
  cy.contains("Client").should("exist");
  cy.contains(CUSTOMER_NAME).should("exist");
  cy.contains(COMPANY_NAME).should("exist");
  cy.contains(GUEST_EMAIL).should("exist");
  cy.contains(PHONE).should("exist");
  cy.contains(PRODUCT_NAME).should("exist");
  cy.contains(PRODUCT_ITEM_NO).should("exist");
  cy.contains(SHIPPING.name).should("exist");
};
