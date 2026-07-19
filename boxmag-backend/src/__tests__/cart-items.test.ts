import { describe, expect, it } from "vitest";
import { parseCartItemsJson } from "../utils/cart-items";

describe("parseCartItemsJson", () => {
  it("returns null for null input", () => {
    expect(parseCartItemsJson(null)).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseCartItemsJson("{not valid json")).toBeNull();
  });

  it("returns null when the parsed value is not an array", () => {
    expect(parseCartItemsJson(JSON.stringify({ itemNo: "A1" }))).toBeNull();
  });

  it("returns null when the array has no usable entries", () => {
    expect(parseCartItemsJson(JSON.stringify([{ unitPrice: 5 }, null, 42]))).toBeNull();
  });

  it("parses a well-formed cart item array", () => {
    const raw = JSON.stringify([
      {
        itemNo: "A1",
        name: "Box A",
        unitPrice: 10,
        quantity: 3,
        imageUrl: "https://example.com/a.png",
      },
    ]);

    expect(parseCartItemsJson(raw)).toEqual([
      {
        itemNo: "A1",
        name: "Box A",
        unitPrice: 10,
        quantity: 3,
        lineTotal: 30,
        imageUrl: "https://example.com/a.png",
      },
    ]);
  });

  it("computes lineTotal from unitPrice*quantity when missing", () => {
    const raw = JSON.stringify([{ itemNo: "A1", unitPrice: 2.5, quantity: 4 }]);
    const result = parseCartItemsJson(raw);
    expect(result?.[0]?.lineTotal).toBe(10);
  });

  it("defaults invalid numeric fields to 0 and drops entries without itemNo/name", () => {
    const raw = JSON.stringify([
      { itemNo: "", name: "", unitPrice: "bad", quantity: "bad" },
      { itemNo: "B2", unitPrice: "bad", quantity: "bad" },
    ]);
    const result = parseCartItemsJson(raw);
    expect(result).toHaveLength(1);
    expect(result?.[0]).toMatchObject({ itemNo: "B2", unitPrice: 0, quantity: 0 });
  });

  it("defaults imageUrl to null when missing or not a string", () => {
    const raw = JSON.stringify([{ itemNo: "A1", imageUrl: 123 }]);
    const result = parseCartItemsJson(raw);
    expect(result?.[0]?.imageUrl).toBeNull();
  });
});
