import { describe, expect, it } from "vitest";
import { boxTypeTitle } from "../../app/i18n/box-type-title";
import { translations, type Language } from "../../app/i18n/translations";

const makeT = (language: Language) => (key: string) =>
  translations[language][key] ?? translations.en[key] ?? key;

describe("boxTypeTitle", () => {
  it("returns the Romanian name for a known slug", () => {
    expect(boxTypeTitle(makeT("ro"), "flaps-box-fefco-201", "Flaps Box - Fefco 201")).toBe(
      "Cutii clasice (Fefco 201)",
    );
  });

  it("falls back to the DB title in English", () => {
    expect(boxTypeTitle(makeT("en"), "flaps-box-fefco-201", "Flaps Box - Fefco 201")).toBe(
      "Flaps Box - Fefco 201",
    );
  });

  it("falls back for unknown or missing slugs", () => {
    expect(boxTypeTitle(makeT("ro"), "new-admin-box", "New Box")).toBe("New Box");
    expect(boxTypeTitle(makeT("ro"), undefined, "New Box")).toBe("New Box");
  });
});
