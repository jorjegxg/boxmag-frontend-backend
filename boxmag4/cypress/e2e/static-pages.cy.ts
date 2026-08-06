/**
 * E2E smoke — static / legal content pages
 */

const pages: Array<{ path: string; heading: string }> = [
  { path: "/about", heading: "About Us" },
  { path: "/delivery", heading: "Delivery of goods" },
  { path: "/how-to-buy", heading: "How to buy" },
  { path: "/privacy-policy", heading: "Privacy Policy" },
  { path: "/regulations", heading: "Regulations" },
  { path: "/complaints-and-returns", heading: "Complaints and returns" },
];

describe("Static pages smoke", () => {
  for (const page of pages) {
    it(`renders ${page.path}`, () => {
      cy.setCookie("boxmag.language", "en");
      cy.visit(page.path, {
        onBeforeLoad(win) {
          win.localStorage.setItem("boxmag.language", "en");
        },
      });
      cy.contains("h1", page.heading, { matchCase: false }).should("exist");
    });
  }
});
