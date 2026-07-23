export const VAT_NUMBER = "RO2816464";
export const GUEST_EMAIL = "yotrevorgxg@gmail.com";
export const CUSTOMER_NAME = "Ion Popescu";
export const FIRST_NAME = "Ion";
export const SURNAME = "Popescu";
export const PHONE = "+40799111222";
export const ADDRESS = "Str. Test 10";
export const POSTCODE = "010101";
export const CITY = "Bucuresti";
export const COUNTRY = "RO";
export const CARDBOARD_TYPE = "B Wave";
export const CARDBOARD_COLOUR = "Brown On Both Side";
export const BOX_PRINT = "No Color";
export const SIZE_TYPE = "Internal Size - mm";
export const TRANSPORT = "Own";
export const QUANTITY = "500";
export const EXPECTED_SIZE = `400 x 300 x 200 mm (${SIZE_TYPE})`;
export const STORAGE_KEY = "boxmag.b2b.orderSuccess";
export const ACCOUNT_PASSWORD = "TestPass123!";
export const VERIFICATION_TOKEN = "cypress-b2b-email-verify-token";

export const BACKEND_URL = (
  Cypress.env("backendUrl") as string | undefined
)?.replace(/\/$/, "") ?? "http://localhost:3005";

export type CreateOrderBody = {
  boxTypeName: string;
  companyName: string;
  cardboardType: string;
  cardboardColour: string;
  boxPrint: string;
  transport: string;
  quantity: number;
  message: string;
};

export const setTermsAccepted = (accepted: boolean) => {
  cy.get("#terms-checkbox-basic").then(($el) => {
    const isChecked = $el.attr("aria-checked") === "true";
    if (isChecked !== accepted) {
      cy.wrap($el).click({ force: true });
    }
  });
};

export const selectProductCard = (sectionId: string, label: string) => {
  cy.get(`#${sectionId}`)
    .contains(label)
    .closest('[role="button"]')
    .click();
};

export const setupGuestSession = () => {
  cy.window().then((win) => {
    win.localStorage.removeItem("boxmag.auth.loggedIn");
    win.localStorage.removeItem("boxmag.auth.email");
    win.sessionStorage.removeItem(STORAGE_KEY);
  });
};

export const fillBusinessConfigurator = () => {
  cy.get("#section-box-type-cards [role='button']", { timeout: 20000 })
    .should("have.length.at.least", 1)
    .first()
    .click();

  selectProductCard("section-cardboard-type-cards", CARDBOARD_TYPE);
  selectProductCard("section-cardboard-color-cards", CARDBOARD_COLOUR);
  cy.get("#section-box-print-cards").contains("button", BOX_PRINT).click();
  cy.get("#section-size-type-cards")
    .contains("button", SIZE_TYPE)
    .click();
  cy.contains("button", TRANSPORT).click();

  cy.get("#package-length").clear().type("400");
  cy.get("#package-width").clear().type("300");
  cy.get("#package-height").clear().type("200");
  cy.get("#boxes-quantity").clear().type(QUANTITY);
  cy.get('textarea[placeholder*="message"]')
    .clear()
    .type(`Cypress B2B integration ${new Date().toISOString()}`);
  setTermsAccepted(true);
};

export const fillOrderSummaryContact = () => {
  cy.get("#os-firstName").clear().type(FIRST_NAME);
  cy.get("#os-surname").clear().type(SURNAME);
  cy.get("#os-vatNumber").clear().type(VAT_NUMBER);
  cy.get("#os-companyName", { timeout: 30000 }).should(($input) => {
    expect($input.val()?.toString().trim()).not.to.eq("");
  });
  cy.get("#os-email").clear().type(GUEST_EMAIL);
  cy.get("#os-phone").clear().type(PHONE);
  cy.get("#os-address").clear().type(ADDRESS);
  cy.get("#os-postcode").clear().type(POSTCODE);
  cy.get("#os-city").clear().type(CITY);
  cy.get("#os-country").select(COUNTRY);
};

export const placeB2bGuestOrder = () => {
  cy.visit("/business");
  fillBusinessConfigurator();
  cy.contains("button", "NEXT").click();

  cy.location("pathname").should("eq", "/order-summary");
  cy.contains("Order Summary").should("exist");
  fillOrderSummaryContact();

  cy.contains("button", "NEXT").click();
  cy.wait("@createOrder").then((interception) => {
    expect(interception.response?.statusCode).to.eq(201);
    const body = interception.request.body as CreateOrderBody & {
      email: string;
      vatNumber: string;
    };
    expect(body.email).to.eq(GUEST_EMAIL);
    expect(body.vatNumber).to.eq(VAT_NUMBER);
    cy.wrap(body).as("orderPayload");

    const responseBody = interception.response?.body as {
      ok?: boolean;
      data?: {
        id?: number;
        emailsSent?: {
          notification?: boolean;
          customerConfirmation?: boolean;
        };
      };
    };
    expect(responseBody?.ok, "create order ok").to.eq(true);
    expect(
      responseBody?.data?.emailsSent?.notification,
      "internal order notification email sent",
    ).to.eq(true);
    expect(
      responseBody?.data?.emailsSent?.customerConfirmation,
      "customer confirmation email sent",
    ).to.eq(true);
    cy.wrap(responseBody?.data?.id).as("orderId");
  });

  cy.location("pathname").should("eq", "/business/order-success");
  cy.contains(GUEST_EMAIL).should("exist");
  cy.contains("Create a free account").should("exist");

  cy.get(".font-mono.font-semibold.text-my-red")
    .invoke("text")
    .then((orderNumber) => {
      cy.wrap(orderNumber.trim()).as("orderNumber");
    });
};

export const assertAdminTableRow = (
  orderNumber: string,
  order: CreateOrderBody,
) => {
  cy.contains("Comenzi").should("exist");

  cy.contains("tr", orderNumber).within(() => {
    cy.contains(orderNumber).should("exist");
    cy.contains(CUSTOMER_NAME).should("exist");
    cy.contains(order.companyName).should("exist");
    cy.contains(order.boxTypeName).should("exist");
    cy.contains(QUANTITY).should("exist");
    cy.contains("Așteaptă răspuns").should("exist");
    cy.get("select").should("have.value", "new");
    cy.get("select option:selected").should("have.text", "Nouă");
  });
};

export const assertAdminOrderDetail = (
  orderNumber: string,
  order: CreateOrderBody,
) => {
  cy.contains("Detalii comandă").should("exist");
  cy.contains("h2", orderNumber).should("exist");
  cy.contains("Nouă").should("exist");

  cy.contains("Client").should("exist");
  cy.contains(CUSTOMER_NAME).should("exist");
  cy.contains(order.companyName).should("exist");
  cy.contains(GUEST_EMAIL).should("exist");
  cy.contains(PHONE).should("exist");
  cy.contains(CITY).should("exist");
  cy.contains(COUNTRY).should("exist");

  cy.contains("Specificații produs").should("exist");
  cy.contains(order.boxTypeName).should("exist");
  cy.contains(CARDBOARD_TYPE).should("exist");
  cy.contains(CARDBOARD_COLOUR).should("exist");
  cy.contains(BOX_PRINT).should("exist");
  cy.contains(EXPECTED_SIZE).should("exist");
  cy.contains(TRANSPORT).should("exist");
  cy.contains(QUANTITY).should("exist");
  cy.contains(order.message).should("exist");
};

export const assertCustomerOrdersList = (orderNumber: string) => {
  cy.contains("h2", "ORDERS").should("exist");
  cy.contains("No orders found.").should("not.exist");

  cy.contains("a", orderNumber)
    .should("exist")
    .closest("a")
    .within(() => {
      cy.contains(orderNumber).should("exist");
      cy.contains("NEW").should("exist");
    });
};

export const assertCustomerOrderDetail = (
  orderNumber: string,
  order: CreateOrderBody,
) => {
  cy.contains("Order Details").should("exist");
  cy.contains(`Order #${orderNumber}`).should("exist");
  cy.contains("NEW").should("exist");

  cy.contains("Items").should("exist");
  cy.contains(order.boxTypeName).should("exist");
  cy.contains(`${order.quantity} pcs`).should("exist");
  cy.contains(`Cardboard: ${CARDBOARD_TYPE}`).should("exist");
  cy.contains(CARDBOARD_COLOUR).should("exist");
  cy.contains(BOX_PRINT).should("exist");

  cy.contains("Shipping Address").should("exist");
  cy.contains(CUSTOMER_NAME).should("exist");
  cy.contains(order.companyName).should("exist");
  cy.contains(CITY).should("exist");
  cy.contains(COUNTRY).should("exist");
  cy.contains(PHONE).should("exist");
  cy.contains(GUEST_EMAIL).should("exist");

  cy.contains("Order Metadata").should("exist");
  cy.contains(TRANSPORT).should("exist");
  cy.contains(EXPECTED_SIZE).should("exist");

  cy.contains("Customer Message").should("exist");
  cy.contains(order.message).should("exist");
};
