import { describe, expect, it } from "vitest";
import { classifyVatLookup } from "../vat-company";

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
