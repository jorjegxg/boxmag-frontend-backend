/**
 * E2E tests – /account (utilizator autentificat)
 *
 * Toate testele pornesc cu localStorage setat și API-urile mock-uite.
 */

import { TEST_EMAIL } from "../support/commands";

const sampleAddress = {
  id: 1,
  label: "Home",
  companyName: "Boxmag SRL",
  firstName: "Ana",
  lastName: "Popescu",
  phone: "799111222",
  addressLine1: "Str. Test 10",
  addressLine2: "Ap. 4",
  postcode: "725400",
  city: "Radauti",
  country: "RO",
  isDefaultBilling: true,
  isDefaultShipping: true,
};

const fillAddressForm = (overrides: Partial<{
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
}> = {}) => {
  const data = {
    label: "Office",
    companyName: "Test Company",
    firstName: "Ana",
    lastName: "Popescu",
    phone: "799111222",
    addressLine1: "Str. Noua 20",
    addressLine2: "Etaj 2",
    postcode: "725400",
    city: "Radauti",
    country: "RO",
    ...overrides,
  };

  if (data.label) {
    cy.get('input[placeholder="Label (Home, Warehouse...)"]').clear().type(data.label);
  }
  if (data.companyName) {
    cy.get('input[placeholder="Company Name"]').clear().type(data.companyName);
  }
  cy.get('input[placeholder="First Name *"]').clear().type(data.firstName);
  cy.get('input[placeholder="Last Name *"]').clear().type(data.lastName);
  if (data.phone) {
    cy.get('input[placeholder="Phone"]').clear().type(data.phone);
  }
  cy.get('input[placeholder="Address line 1 *"]').clear().type(data.addressLine1);
  if (data.addressLine2) {
    cy.get('input[placeholder="Address line 2"]').clear().type(data.addressLine2);
  }
  cy.get('input[placeholder="Postcode *"]').clear().type(data.postcode);
  cy.get('input[placeholder="City *"]').clear().type(data.city);
  cy.get('input[placeholder="Country *"]').clear().type(data.country);
};

// ---------------------------------------------------------------------------

describe("/account – shell autentificat", () => {
  beforeEach(() => {
    cy.visitAccountLoggedIn();
  });

  it("nu afișează formularul de Sign in", () => {
    cy.contains("h2", "Sign in").should("not.exist");
  });

  it("afișează sidebar-ul cu toate tab-urile și Sign out", () => {
    cy.contains("button", "MY ACCOUNT").should("exist");
    cy.contains("button", "ADDRESS").should("exist");
    cy.contains("button", "ORDERS").should("exist");
    cy.contains("button", "SIGN OUT").should("exist");
  });

  it("evidențiază tab-ul MY ACCOUNT ca activ la încărcare", () => {
    cy.contains("button", "MY ACCOUNT")
      .should("have.class", "bg-my-red")
      .and("have.class", "text-white");
  });

  it("afișează titlul ACCOUNT MANAGEMENT în bara roșie", () => {
    cy.contains("h1", "ACCOUNT MANAGEMENT").should("exist");
  });

  it("rămâne autentificat după reload", () => {
    cy.reload();
    cy.wait(["@getProfile", "@getAddresses", "@getOrders"]);
    cy.contains("button", "MY ACCOUNT").should("exist");
    cy.contains("h2", "Sign in").should("not.exist");
    cy.get("#acc-first").should("have.value", "John");
  });
});

// ---------------------------------------------------------------------------

describe("/account – tab My Account (logat)", () => {
  beforeEach(() => {
    cy.visitAccountLoggedIn();
  });

  it("afișează cele 3 secțiuni: Name, Contact, Email", () => {
    cy.contains("h3", "Name").should("exist");
    cy.contains("h3", "Contact").should("exist");
    cy.contains("h3", "Email").should("exist");
  });

  it("afișează butoanele SAVE în fiecare secțiune", () => {
    cy.get("main")
      .find("button")
      .filter((_, el) => Cypress.$(el).text().trim() === "SAVE")
      .should("have.length", 3);
  });

  it("afișează prefixul telefon RO +40", () => {
    cy.contains("RO +40").should("exist");
  });

  it("populează profilul din API", () => {
    cy.get("#acc-first").should("have.value", "John");
    cy.get("#acc-last").should("have.value", "Doe");
    cy.get("#acc-phone").should("have.value", "799111222");
    cy.get("#acc-email").should("have.value", TEST_EMAIL);
  });

  it("afișează Loading în timp ce se încarcă profilul", () => {
    cy.mockAccountApis();
    cy.intercept("GET", "**/api/auth/profile*", (req) => {
      req.reply((res) => {
        res.setDelay(800);
        res.send({
          statusCode: 200,
          body: {
            ok: true,
            data: {
              firstName: "John",
              lastName: "Doe",
              phone: "799111222",
              email: TEST_EMAIL,
            },
          },
        });
      });
    }).as("slowProfile");

    cy.visit("/account", {
      onBeforeLoad(win) {
        win.localStorage.setItem("boxmag.auth.loggedIn", "true");
        win.localStorage.setItem("boxmag.auth.email", TEST_EMAIL);
      },
    });

    cy.contains("Loading account details...").should("exist");
    cy.wait("@slowProfile");
    cy.get("#acc-first").should("have.value", "John");
  });

  it("permite modificarea numelui, telefonului și emailului", () => {
    cy.get("#acc-first").clear().type("Elena");
    cy.get("#acc-last").clear().type("Ionescu");
    cy.get("#acc-phone").clear().type("721234567");
    cy.get("#acc-email").clear().type("elena@example.com");

    cy.get("#acc-first").should("have.value", "Elena");
    cy.get("#acc-last").should("have.value", "Ionescu");
    cy.get("#acc-phone").should("have.value", "721234567");
    cy.get("#acc-email").should("have.value", "elena@example.com");
  });
});

// ---------------------------------------------------------------------------

describe("/account – tab Address (logat)", () => {
  beforeEach(() => {
    cy.visitAccountLoggedIn();
    cy.openAccountTab("address");
  });

  it("schimbă titlul paginii la ADDRESS", () => {
    cy.contains("h1", "ADDRESS").should("exist");
    cy.contains("button", "ADDRESS")
      .should("have.class", "bg-my-red")
      .and("have.class", "text-white");
  });

  it("afișează detaliile complete ale unei adrese salvate", () => {
    cy.visitAccountLoggedIn({ addresses: [sampleAddress] });
    cy.openAccountTab("address");

    cy.contains("Ana Popescu").should("exist");
    cy.contains("Boxmag SRL").should("exist");
    cy.contains(/home/i).should("exist");
    cy.contains("Str. Test 10").should("exist");
    cy.contains("Ap. 4").should("exist");
    cy.contains("725400 Radauti").should("exist");
    cy.contains("Tel: 799111222").should("exist");
    cy.contains("Default shipping").should("exist");
    cy.contains("Default billing").should("exist");
  });

  it("afișează doar Default billing când shipping nu e implicit", () => {
    cy.visitAccountLoggedIn({
      addresses: [{ ...sampleAddress, isDefaultShipping: false, isDefaultBilling: true }],
    });
    cy.openAccountTab("address");

    cy.contains("h3", "Saved addresses")
      .parent()
      .find(".rounded-lg.border.p-4")
      .first()
      .within(() => {
        cy.get("p.text-xs.text-gray-500").should("contain", "Default billing");
        cy.get("p.text-xs.text-gray-500").should("not.contain", "Default shipping");
      });
  });

  it("resetează formularul după salvarea unei adrese noi", () => {
    cy.intercept("POST", "**/api/addresses", {
      statusCode: 200,
      body: { ok: true },
    }).as("createAddress");

    cy.intercept("GET", "**/api/addresses*", {
      statusCode: 200,
      body: { ok: true, data: [] },
    }).as("reloadAddresses");

    fillAddressForm();
    cy.contains("button", "Save address").click();
    cy.wait("@createAddress");

    cy.get('input[placeholder="First Name *"]').should("have.value", "");
    cy.get('input[placeholder="Address line 1 *"]').should("have.value", "");
  });

  it("trimite PUT la actualizarea unei adrese", () => {
    cy.visitAccountLoggedIn({ addresses: [sampleAddress] });
    cy.openAccountTab("address");

    cy.intercept("PUT", "**/api/addresses/1", {
      statusCode: 200,
      body: { ok: true },
    }).as("updateAddress");

    cy.intercept("GET", "**/api/addresses*", {
      statusCode: 200,
      body: {
        ok: true,
        data: [{ ...sampleAddress, addressLine1: "Str. Actualizata 99" }],
      },
    }).as("reloadAddresses");

    cy.contains("button", "Edit").click();
    cy.get('input[placeholder="Address line 1 *"]').clear().type("Str. Actualizata 99");
    cy.contains("button", "Update address").click();

    cy.wait("@updateAddress").its("request.body").should((body) => {
      expect(body.addressLine1).to.eq("Str. Actualizata 99");
      expect(body.email).to.eq(TEST_EMAIL);
    });
    cy.wait("@reloadAddresses");
    cy.contains("Str. Actualizata 99").should("exist");
  });

  it("trimite DELETE la ștergerea unei adrese", () => {
    cy.visitAccountLoggedIn({ addresses: [sampleAddress] });
    cy.openAccountTab("address");

    cy.intercept("DELETE", "**/api/addresses/1*", {
      statusCode: 200,
      body: { ok: true },
    }).as("deleteAddress");

    cy.intercept("GET", "**/api/addresses*", {
      statusCode: 200,
      body: { ok: true, data: [] },
    }).as("reloadAddresses");

    cy.contains("button", "Delete").click();
    cy.wait("@deleteAddress");
    cy.wait("@reloadAddresses");
    cy.contains("No saved addresses yet.").should("exist");
  });

  it("afișează eroare când salvarea adresei eșuează", () => {
    cy.intercept("POST", "**/api/addresses", {
      statusCode: 400,
      body: { ok: false, message: "Address validation failed" },
    }).as("createAddressFail");

    fillAddressForm({ firstName: "Ana", lastName: "Popescu" });
    cy.contains("button", "Save address").click();

    cy.wait("@createAddressFail");
    cy.contains("Address validation failed").should("exist");
  });

  it("permite bifarea/debifarea default shipping și billing", () => {
    cy.contains("label", "Default shipping")
      .find('input[type="checkbox"]')
      .uncheck({ force: true });
    cy.contains("label", "Default billing")
      .find('input[type="checkbox"]')
      .uncheck({ force: true });

    cy.contains("label", "Default shipping")
      .find('input[type="checkbox"]')
      .should("not.be.checked");
    cy.contains("label", "Default billing")
      .find('input[type="checkbox"]')
      .should("not.be.checked");
  });
});

// ---------------------------------------------------------------------------

describe("/account – tab Orders (logat)", () => {
  beforeEach(() => {
    cy.visitAccountLoggedIn();
    cy.openAccountTab("orders");
  });

  it("schimbă titlul paginii la ORDERS", () => {
    cy.contains("h1", "ORDERS").should("exist");
    cy.contains("button", "ORDERS")
      .should("have.class", "bg-my-red")
      .and("have.class", "text-white");
  });

  it("afișează header-ul tabelului de comenzi", () => {
    cy.contains("Date").should("exist");
    cy.contains("Order Number").should("exist");
    cy.contains("Status").should("exist");
  });

  it("afișează mai multe comenzi cu statusuri diferite", () => {
    cy.visitAccountLoggedIn({
      orders: [
        {
          id: 1,
          orderNumber: "ORD-001",
          status: "processing",
          createdAt: "2026-05-20T10:00:00.000Z",
        },
        {
          id: 2,
          orderNumber: "ORD-002",
          status: "shipped",
          createdAt: "2026-05-18T10:00:00.000Z",
        },
        {
          id: 3,
          orderNumber: "ORD-003",
          status: "completed",
          createdAt: "2026-05-15T10:00:00.000Z",
        },
      ],
    });
    cy.openAccountTab("orders");

    cy.contains("ORD-001").should("exist");
    cy.contains("ORD-002").should("exist");
    cy.contains("ORD-003").should("exist");
    cy.contains("PROCESSING").should("exist");
    cy.contains("SHIPPED").should("exist");
    cy.contains("COMPLETED").should("exist");
  });

  it("navighează la detaliile comenzii la click", () => {
    cy.visitAccountLoggedIn({
      orders: [
        {
          id: 99,
          orderNumber: "ORD-2026-099",
          status: "new",
          createdAt: "2026-05-26T10:00:00.000Z",
        },
      ],
    });
    cy.openAccountTab("orders");

    cy.intercept("GET", "**/api/orders/99*", {
      statusCode: 200,
      body: {
        ok: true,
        data: {
          id: 99,
          orderNumber: "ORD-2026-099",
          boxTypeName: "Standard",
          cardboardType: "Kraft",
          cardboardColour: "Brown",
          boxPrint: "None",
          quantity: 100,
          transport: "Standard",
          size: "300x200x150",
          status: "new",
          paymentStatus: "paid",
          companyName: "Test SRL",
          customerName: "John Doe",
          email: TEST_EMAIL,
          phone: "+40799111222",
          city: "Radauti",
          country: "RO",
          message: "",
          items: [],
          priceBreakdown: null,
          attachmentName: null,
          createdAt: "2026-05-26T10:00:00.000Z",
        },
      },
    }).as("getOrderDetails");

    cy.get('a[href="/account/orders/99"]').click();
    cy.wait("@getOrderDetails");
    cy.location("pathname").should("eq", "/account/orders/99");
    cy.contains("ORD-2026-099").should("exist");
  });
});

// ---------------------------------------------------------------------------

describe("/account – navigare și logout (logat)", () => {
  beforeEach(() => {
    cy.visitAccountLoggedIn({
      addresses: [sampleAddress],
      orders: [
        {
          id: 10,
          orderNumber: "ORD-010",
          status: "processing",
          createdAt: "2026-05-20T10:00:00.000Z",
        },
      ],
    });
  });

  it("parcurge toate tab-urile și revine la My Account", () => {
    cy.openAccountTab("address");
    cy.contains("Saved addresses").should("exist");

    cy.openAccountTab("orders");
    cy.contains("ORD-010").should("exist");

    cy.openAccountTab("account");
    cy.get("#acc-first").should("have.value", "John");
  });

  it("deconectează și ascunde conținutul autentificat", () => {
    cy.contains("button", "SIGN OUT").click();

    cy.contains("h2", "Sign in").should("exist");
    cy.get("#acc-first").should("not.exist");
    cy.contains("Saved addresses").should("not.exist");

    cy.window().then((win) => {
      expect(win.localStorage.getItem("boxmag.auth.loggedIn")).to.be.null;
      expect(win.localStorage.getItem("boxmag.auth.email")).to.be.null;
    });
  });
});
