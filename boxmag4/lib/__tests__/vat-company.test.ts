import { describe, expect, it } from "vitest";
import { classifyVatLookup, shouldAutofillCompany } from "../vat-company";

describe("classifyVatLookup", () => {
  it("returns filled when company name is present", () => {
    const outcome = classifyVatLookup({
      ok: true,
      companyName: "Boxmag SRL",
    });
    expect(outcome.kind).toBe("filled");
    if (outcome.kind === "filled") {
      expect(outcome.payload.companyName).toBe("Boxmag SRL");
    }
  });

  it("returns manual_name when VAT is valid but name unavailable", () => {
    const outcome = classifyVatLookup({
      ok: true,
      companyNameUnavailable: true,
      companyName: null,
      country: "DE",
    });
    expect(outcome.kind).toBe("manual_name");
  });

  it("returns manual_name when lookup services are unavailable", () => {
    const outcome = classifyVatLookup({
      ok: true,
      companyNameUnavailable: true,
      lookupUnavailable: true,
      companyName: null,
      country: "DE",
    });
    expect(outcome.kind).toBe("manual_name");
    if (outcome.kind === "manual_name") {
      expect(outcome.payload.lookupUnavailable).toBe(true);
    }
  });

  it("returns error when lookup failed", () => {
    const outcome = classifyVatLookup({
      ok: false,
      message: "VAT number not found or invalid",
    });
    expect(outcome.kind).toBe("error");
    if (outcome.kind === "error") {
      expect(outcome.message).toContain("not found");
    }
  });
});

describe("shouldAutofillCompany", () => {
  it("fills an empty field", () => {
    expect(shouldAutofillCompany("", null)).toBe(true);
    expect(shouldAutofillCompany("   ", "Old SRL")).toBe(true);
  });

  it("replaces a value that is still the previous autofill", () => {
    expect(shouldAutofillCompany("Old SRL", "Old SRL")).toBe(true);
  });

  it("never overwrites a name the user typed or edited", () => {
    expect(shouldAutofillCompany("My Company", null)).toBe(false);
    expect(shouldAutofillCompany("Old SRL Edited", "Old SRL")).toBe(false);
  });
});
