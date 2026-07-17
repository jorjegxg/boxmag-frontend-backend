/// <reference types="cypress" />

export const AUTH_STORAGE_KEY = "boxmag.auth.loggedIn";
export const AUTH_EMAIL_STORAGE_KEY = "boxmag.auth.email";
export const CART_STORAGE_KEY = "boxmag.cart";
export const TEST_EMAIL = "test@example.com";

export type SeedCartItem = {
  itemNo: string;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
};

export const sampleWarehouseAddress: MockAddress = {
  id: 1,
  label: "Warehouse",
  companyName: "Boxmag SRL",
  firstName: "Ana",
  lastName: "Popescu",
  phone: "799111222",
  addressLine1: "Str. Depozit 15",
  addressLine2: "Hala B",
  postcode: "725400",
  city: "Radauti",
  country: "RO",
  isDefaultBilling: true,
  isDefaultShipping: true,
};

export const sampleHomeAddress: MockAddress = {
  id: 2,
  label: "Home",
  companyName: "",
  firstName: "Ion",
  lastName: "Vasilescu",
  phone: "721111111",
  addressLine1: "Str. Acasa 3",
  addressLine2: "",
  postcode: "010101",
  city: "Bucuresti",
  country: "RO",
  isDefaultBilling: false,
  isDefaultShipping: false,
};

export type MockProfile = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  companyName?: string;
  vatNumber?: string;
};

export type MockAddress = {
  id: number;
  label: string;
  companyName: string;
  firstName: string;
  lastName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  postcode: string;
  city: string;
  country: string;
  isDefaultBilling: boolean;
  isDefaultShipping: boolean;
};

export type MockOrder = {
  id: number;
  orderNumber: string;
  status: string;
  createdAt: string;
};

type AccountTab = "account" | "address" | "orders";

const TAB_LABELS: Record<AccountTab, string> = {
  account: "MY ACCOUNT",
  address: "ADDRESS",
  orders: "ORDERS",
};

declare global {
  namespace Cypress {
    interface Chainable {
      visitAccountLoggedOut(): Chainable<void>;
      visitAccountLoggedIn(options?: {
        email?: string;
        profile?: MockProfile;
        addresses?: MockAddress[];
        orders?: MockOrder[];
      }): Chainable<void>;
      mockAccountApis(options?: {
        profile?: MockProfile;
        addresses?: MockAddress[];
        orders?: MockOrder[];
      }): Chainable<void>;
      openAccountTab(tab: AccountTab): Chainable<void>;
      seedCart(items?: SeedCartItem[]): Chainable<void>;
      mockCheckoutApis(): Chainable<void>;
      visitCheckoutLoggedIn(options?: {
        email?: string;
        addresses?: MockAddress[];
        cartItems?: SeedCartItem[];
      }): Chainable<void>;
      visitCheckoutLoggedOut(options?: { cartItems?: SeedCartItem[] }): Chainable<void>;
      loginAdmin(): Chainable<void>;
    }
  }
}

const defaultProfile: MockProfile = {
  firstName: "John",
  lastName: "Doe",
  phone: "799111222",
  email: TEST_EMAIL,
};

Cypress.Commands.add(
  "mockAccountApis",
  (options: {
    profile?: MockProfile;
    addresses?: MockAddress[];
    orders?: MockOrder[];
  } = {}) => {
    const profile = options.profile ?? defaultProfile;
    const addresses = options.addresses ?? [];
    const orders = options.orders ?? [];

    cy.intercept("GET", "**/api/auth/profile*", {
      statusCode: 200,
      body: { ok: true, data: profile },
    }).as("getProfile");

    cy.intercept("GET", "**/api/addresses*", {
      statusCode: 200,
      body: { ok: true, data: addresses },
    }).as("getAddresses");

    cy.intercept("GET", "**/api/orders*", {
      statusCode: 200,
      body: { ok: true, data: orders },
    }).as("getOrders");
  },
);

Cypress.Commands.add("visitAccountLoggedOut", () => {
  cy.visit("/account", {
    onBeforeLoad(win) {
      win.localStorage.removeItem(AUTH_STORAGE_KEY);
      win.localStorage.removeItem(AUTH_EMAIL_STORAGE_KEY);
    },
  });
});

Cypress.Commands.add(
  "visitAccountLoggedIn",
  (options: {
    email?: string;
    profile?: MockProfile;
    addresses?: MockAddress[];
    orders?: MockOrder[];
  } = {}) => {
    const email = options.email ?? TEST_EMAIL;
    const profile = { ...(options.profile ?? defaultProfile), email };

    cy.mockAccountApis({
      profile,
      addresses: options.addresses,
      orders: options.orders,
    });

    cy.visit("/account", {
      onBeforeLoad(win) {
        win.localStorage.setItem(AUTH_STORAGE_KEY, "true");
        win.localStorage.setItem(AUTH_EMAIL_STORAGE_KEY, email);
      },
    });

    cy.wait(["@getProfile", "@getAddresses", "@getOrders"]);
  },
);

Cypress.Commands.add("openAccountTab", (tab: AccountTab) => {
  cy.contains("button", TAB_LABELS[tab]).click();
});

const defaultCartItem = {
  itemNo: "BOX-001",
  name: "Custom Box 300x200",
  unitPrice: 12.5,
  quantity: 100,
  imageUrl: "/b2b/boxes/box.png",
};

function buildCartStorage(
  items: SeedCartItem[],
) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  return JSON.stringify({
    state: {
      items,
      newCartItems: totalItems,
      subtotal,
      totalItems,
    },
    version: 0,
  });
}

function setAuthInWindow(win: Window, email: string) {
  win.localStorage.setItem(AUTH_STORAGE_KEY, "true");
  win.localStorage.setItem(AUTH_EMAIL_STORAGE_KEY, email);
}

Cypress.Commands.add(
  "seedCart",
  (items: SeedCartItem[] = [defaultCartItem]) => {
    const payload = buildCartStorage(items);
    cy.window().then((win) => {
      win.localStorage.setItem(CART_STORAGE_KEY, payload);
    });
  },
);

Cypress.Commands.add("mockCheckoutApis", () => {
  cy.intercept("GET", "**/api/shipping-methods", {
    statusCode: 200,
    body: {
      ok: true,
      data: [
        {
          id: 1,
          key: "standard",
          name: "Standard Delivery",
          etaText: "Estimated 7-10 days",
          price: 25,
          isActive: true,
          sortOrder: 1,
        },
      ],
    },
  }).as("getShippingMethods");
});

Cypress.Commands.add("loginAdmin", () => {
  const password = String(Cypress.env("adminPassword") ?? "change-me-admin-password");
  cy.request("POST", "/api/admin/auth", { password }).its("status").should("eq", 200);
});

Cypress.Commands.add("visitCheckoutLoggedOut", (options: { cartItems?: SeedCartItem[] } = {}) => {
  cy.mockCheckoutApis();
  const cartItems = options.cartItems ?? [defaultCartItem];
  cy.visit("/checkout", {
    onBeforeLoad(win) {
      win.localStorage.removeItem(AUTH_STORAGE_KEY);
      win.localStorage.removeItem(AUTH_EMAIL_STORAGE_KEY);
      win.localStorage.setItem(CART_STORAGE_KEY, buildCartStorage(cartItems));
    },
  });
  cy.wait("@getShippingMethods");
});

Cypress.Commands.add(
  "visitCheckoutLoggedIn",
  (options: { email?: string; addresses?: MockAddress[]; cartItems?: SeedCartItem[] } = {}) => {
    const email = options.email ?? TEST_EMAIL;
    const addresses = options.addresses ?? [];
    const cartItems = options.cartItems ?? [defaultCartItem];

    cy.mockCheckoutApis();
    cy.intercept("GET", "**/api/addresses*", {
      statusCode: 200,
      body: { ok: true, data: addresses },
    }).as("getCheckoutAddresses");

    cy.visit("/checkout", {
      onBeforeLoad(win) {
        setAuthInWindow(win, email);
        win.localStorage.setItem(CART_STORAGE_KEY, buildCartStorage(cartItems));
      },
    });

    cy.wait(["@getShippingMethods", "@getCheckoutAddresses"]);
  },
);

export {};
