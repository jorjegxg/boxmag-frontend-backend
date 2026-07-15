/**
 * b2b-guest-integration (PAGES_TESTS_TODO.2md)
 *
 * 1. Guest (not authenticated)
 * 2. Email: yotrevorgxg@gmail.com
 * 3. VAT: RO2816464
 * 4. Place B2B order
 * 5. Choose not to create an account
 * 6. Order appears in admin under "Comenzi"
 * 7. Table row data, status "Nouă", Răspuns "Așteaptă răspuns"
 * 8. Order detail page shows correct information
 * 9. Manual: check inbox for confirmation email
 *
 * Requires frontend (:3006), backend (:3005), and MySQL.
 */

const VAT_NUMBER = "RO2816464";
const GUEST_EMAIL = "yotrevorgxg@gmail.com";
const CUSTOMER_NAME = "Ion Popescu";
const FIRST_NAME = "Ion";
const SURNAME = "Popescu";
const PHONE = "+40799111222";
const ADDRESS = "Str. Test 10";
const POSTCODE = "010101";
const CITY = "Bucuresti";
const COUNTRY = "RO";
const CARDBOARD_TYPE = "B Wave";
const CARDBOARD_COLOUR = "Brown On Both Side";
const BOX_PRINT = "No Color";
const SIZE_TYPE = "Internal Size - mm";
const TRANSPORT = "Own";
const QUANTITY = "500";
const EXPECTED_SIZE = `400 x 300 x 200 mm (${SIZE_TYPE})`;
const STORAGE_KEY = "boxmag.b2b.orderSuccess";
const BACKEND_URL = (
  Cypress.env("backendUrl") as string | undefined
)?.replace(/\/$/, "") ?? "http://localhost:3005";

type CreateOrderBody = {
  boxTypeName: string;
  companyName: string;
  cardboardType: string;
  cardboardColour: string;
  boxPrint: string;
  transport: string;
  quantity: number;
  message: string;
};

const setTermsAccepted = (accepted: boolean) => {
  cy.get("#terms-checkbox-basic").then(($el) => {
    const isChecked = $el.attr("aria-checked") === "true";
    if (isChecked !== accepted) {
      cy.wrap($el).click({ force: true });
    }
  });
};

const selectProductCard = (sectionId: string, label: string) => {
  cy.get(`#${sectionId}`)
    .contains(label)
    .closest('[role="button"]')
    .click();
};

const setupGuestSession = () => {
  cy.window().then((win) => {
    win.localStorage.removeItem("boxmag.auth.loggedIn");
    win.localStorage.removeItem("boxmag.auth.email");
    win.sessionStorage.removeItem(STORAGE_KEY);
  });
};

const fillBusinessConfigurator = () => {
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

const fillOrderSummaryContact = () => {
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

const assertAdminTableRow = (
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

const assertAdminOrderDetail = (
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

describe("b2b-guest-integration", () => {
  before(function () {
    cy.request({
      method: "GET",
      url: `${BACKEND_URL}/api/health`,
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status !== 200) {
        cy.log(
          `Skipping integration test: backend unavailable at ${BACKEND_URL}/api/health (status ${response.status})`,
        );
        this.skip();
      }
    });
  });

  beforeEach(() => {
    setupGuestSession();
    cy.intercept("POST", "**/api/orders").as("createOrder");
  });

  it("guest places order, skips account, admin Comenzi table and detail are correct", () => {
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
      expect(body.cardboardType).to.eq(CARDBOARD_TYPE);
      expect(body.cardboardColour).to.eq(CARDBOARD_COLOUR);
      expect(body.transport).to.eq(TRANSPORT);
      expect(Number(body.quantity)).to.eq(500);
      cy.wrap(body).as("orderPayload");
    });

    cy.location("pathname").should("eq", "/business/order-success");
    cy.contains(GUEST_EMAIL).should("exist");
    cy.contains("Create a free account").should("exist");

    cy.get(".font-mono.font-semibold.text-my-red")
      .invoke("text")
      .then((orderNumber) => {
        cy.wrap(orderNumber.trim()).as("orderNumber");
      });

    cy.contains("button", "No, thanks").click();
    cy.location("pathname").should("eq", "/");
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem(STORAGE_KEY)).to.be.null;
    });

    cy.loginAdmin();
    cy.intercept("GET", "**/api/orders").as("getAdminOrders");
    cy.visit("/admin");
    cy.wait("@getAdminOrders");

    cy.get<CreateOrderBody>("@orderPayload").then((orderPayload) => {
      cy.get<string>("@orderNumber").then((orderNumber) => {
        assertAdminTableRow(orderNumber, orderPayload);
        cy.contains("tr", orderNumber).click();
        cy.location("pathname").should("match", /^\/admin\/orders\/\d+$/);
        assertAdminOrderDetail(orderNumber, orderPayload);

        cy.log(
          `MANUAL CHECK: open ${GUEST_EMAIL} and confirm the B2B order confirmation email for ${orderNumber} was received.`,
        );
      });
    });
  });
});
