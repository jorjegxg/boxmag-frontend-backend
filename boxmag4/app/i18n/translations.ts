export type Language = "en" | "ro" | "de";

export type TranslationMap = Record<string, string>;

import en from "./locales/en.json";
import ro from "./locales/ro.json";
import de from "./locales/de.json";

export const translations: Record<Language, TranslationMap> = {
  en,
  ro,
  de,
};
