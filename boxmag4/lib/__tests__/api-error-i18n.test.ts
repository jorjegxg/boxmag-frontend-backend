import { describe, expect, it } from "vitest";
import {
  API_ERROR_KEYS,
  apiErrorKey,
  localizeApiError,
} from "../api-error-i18n";
import { VAT_LOOKUP_ERROR_KEYS } from "../vat-company";
import en from "../../app/i18n/locales/en.json";
import ro from "../../app/i18n/locales/ro.json";
import de from "../../app/i18n/locales/de.json";

const locales: Record<string, Record<string, string>> = { en, ro, de };

describe("apiErrorKey", () => {
  it("maps exact backend messages", () => {
    expect(apiErrorKey("Invalid email or password")).toBe(
      "account.error.invalidCredentials",
    );
    expect(apiErrorKey("An account with this email already exists")).toBe(
      "apiError.emailExists",
    );
  });

  it("maps dynamic messages by prefix", () => {
    expect(
      apiErrorKey(
        "Minimum order quantity is 100 pcs per product. Item X has quantity 5.",
      ),
    ).toBe("checkout.error.minOrderQty");
    expect(apiErrorKey("Stripe error: card declined")).toBe(
      "apiError.paymentProvider",
    );
  });

  it("returns null for unknown or empty messages", () => {
    expect(apiErrorKey("Something unexpected")).toBeNull();
    expect(apiErrorKey(undefined)).toBeNull();
    expect(apiErrorKey("  ")).toBeNull();
  });
});

describe("localizeApiError", () => {
  const t = (key: string) => ro[key as keyof typeof ro] ?? key;

  it("translates known messages and never leaks raw English", () => {
    expect(localizeApiError("Your account is inactive", t, "x")).toBe(
      ro["apiError.accountInactive"],
    );
    expect(
      localizeApiError("Failed to register user", t, "registration.error.failed"),
    ).toBe(ro["registration.error.failed"]);
  });
});

describe("error translation coverage", () => {
  const keys = [...API_ERROR_KEYS, ...Object.values(VAT_LOOKUP_ERROR_KEYS)];

  it.each(Object.keys(locales))("%s has every error key", (lang) => {
    const missing = keys.filter((key) => !locales[lang][key]);
    expect(missing).toEqual([]);
  });
});
