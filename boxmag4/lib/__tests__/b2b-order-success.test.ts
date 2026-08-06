import { beforeEach, describe, expect, it } from "vitest";
import {
  B2B_ORDER_SUCCESS_STORAGE_KEY,
  buildRegistrationUrlFromOrderSuccess,
  clearB2bOrderSuccessPayload,
  formatOrderNumber,
  readB2bOrderSuccessPayload,
  writeB2bOrderSuccessPayload,
  type B2bOrderSuccessPayload,
} from "../b2b-order-success";

const validPayload: B2bOrderSuccessPayload = {
  orderId: 42,
  orderNumber: "ORD-0042",
  email: "guest@example.com",
  firstName: "Ana",
  surname: "Pop",
  companyName: "Firma SRL",
  vatNumber: "RO12345678",
  phone: "+40700000000",
  isGuest: true,
};

/** INV-B2B-GUARDS — session payload read/write for order-success page. */
describe("b2b-order-success (INV-B2B-GUARDS)", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("returns null when session payload is missing", () => {
    expect(readB2bOrderSuccessPayload()).toBeNull();
  });

  it("returns null when payload is incomplete", () => {
    sessionStorage.setItem(
      B2B_ORDER_SUCCESS_STORAGE_KEY,
      JSON.stringify({ orderId: 1, email: "x@y.z" }),
    );
    expect(readB2bOrderSuccessPayload()).toBeNull();
  });

  it("round-trips a valid payload", () => {
    writeB2bOrderSuccessPayload(validPayload);
    expect(readB2bOrderSuccessPayload()).toEqual(validPayload);
  });

  it("clear removes payload", () => {
    writeB2bOrderSuccessPayload(validPayload);
    clearB2bOrderSuccessPayload();
    expect(readB2bOrderSuccessPayload()).toBeNull();
  });

  it("formatOrderNumber pads id", () => {
    expect(formatOrderNumber(7)).toBe("ORD-0007");
  });

  it("buildRegistrationUrlFromOrderSuccess prefills and tags from=b2b-order", () => {
    const url = buildRegistrationUrlFromOrderSuccess(validPayload);
    expect(url).toContain("/registration?");
    expect(url).toContain("email=guest%40example.com");
    expect(url).toContain("from=b2b-order");
    expect(url).toContain("returnTo=%2Faccount%23orders");
  });
});
