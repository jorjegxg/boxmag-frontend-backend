import { defineConfig } from "cypress";
import { readRootEnvValue } from "./lib/root-env";

function envFromRoot(key: string): string {
  return process.env[key] ?? readRootEnvValue(key) ?? "";
}

export default defineConfig({
  env: {
    infoEmail: envFromRoot("NEXT_PUBLIC_INFO_EMAIL"),
    b2bEmail: envFromRoot("NEXT_PUBLIC_B2B_EMAIL"),
    adminPassword: envFromRoot("ADMIN_PASSWORD") || "change-me-admin-password",
    backendUrl:
      envFromRoot("NEXT_PUBLIC_BACKEND_URL") || "http://localhost:3005",
  },
  e2e: {
    baseUrl: "http://localhost:3006",
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: true,
    specPattern: "cypress/e2e/**/*.cy.{ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
  },
});
