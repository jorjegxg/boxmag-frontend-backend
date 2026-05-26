// Global support file for Cypress E2E tests
// Add custom commands or global hooks here

Cypress.on("uncaught:exception", (err) => {
  // Prevent Next.js hydration errors from failing tests
  if (
    err.message.includes("Hydration") ||
    err.message.includes("hydration") ||
    err.message.includes("minified React error")
  ) {
    return false;
  }
});
