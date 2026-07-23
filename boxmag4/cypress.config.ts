import { defineConfig } from "cypress";
import {
  ensurePendingRegistrationForTest,
  resetB2bGuestUser,
  resetDatabaseForTests,
  setEmailVerificationToken,
  assertOrderNotificationEmailLog,
} from "./cypress/plugins/db-tasks";
import { readRootEnvValue } from "./lib/root-env";

function envFromRoot(key: string): string {
  return process.env[key] ?? readRootEnvValue(key) ?? "";
}

function envFlag(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key] ?? readRootEnvValue(key) ?? "";
  if (raw === "") return defaultValue;
  return raw === "1" || raw.toLowerCase() === "true" || raw.toLowerCase() === "yes";
}

export default defineConfig({
  env: {
    infoEmail: envFromRoot("NEXT_PUBLIC_INFO_EMAIL"),
    b2bEmail: envFromRoot("NEXT_PUBLIC_B2B_EMAIL"),
    ordersNotificationTo: envFromRoot("ORDERS_NOTIFICATION_TO") || "orders@boxmag.eu",
    adminPassword: envFromRoot("ADMIN_PASSWORD") || "change-me-admin-password",
    backendUrl:
      envFromRoot("NEXT_PUBLIC_BACKEND_URL") || "http://localhost:3005",
    resetDbBeforeTests: envFlag("CYPRESS_RESET_DB", true),
  },
  e2e: {
    baseUrl: "http://localhost:3006",
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: true,
    specPattern: "cypress/e2e/**/*.cy.{ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
    setupNodeEvents(on, config) {
      on("before:run", async () => {
        if (config.env.resetDbBeforeTests === true) {
          await resetDatabaseForTests();
        } else {
          console.log("[cypress] Skipping database reset (resetDbBeforeTests=false).");
        }
      });

      on("task", {
        resetDatabase() {
          return resetDatabaseForTests();
        },
        resetB2bGuestUser(email: string) {
          return resetB2bGuestUser(email);
        },
        setEmailVerificationToken(options: { email: string; token: string }) {
          return setEmailVerificationToken(options);
        },
        ensurePendingRegistrationForTest(options: {
          email: string;
          password: string;
          token: string;
          firstName: string;
          surname: string;
          companyName: string;
          vatNumber: string;
          phone: string;
        }) {
          return ensurePendingRegistrationForTest(options);
        },
        assertOrderNotificationEmailLog(options: {
          orderId: number;
          mustIncludeRecipient?: string;
        }) {
          return assertOrderNotificationEmailLog(options);
        },
      });
    },
  },
});
