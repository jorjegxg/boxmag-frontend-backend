/// <reference types="cypress" />

export const AUTH_STORAGE_KEY = "boxmag.auth.loggedIn";
export const AUTH_EMAIL_STORAGE_KEY = "boxmag.auth.email";
export const TEST_EMAIL = "test@example.com";

export type MockProfile = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
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

export {};
