import type { Language } from "@/app/i18n/translations";
import { translations } from "@/app/i18n/translations";
import { siteEmails } from "./site-emails";

const emailPlaceholders: Record<string, string> = {
  infoEmail: siteEmails.info,
  b2bEmail: siteEmails.b2b,
  ordersEmail: siteEmails.orders,
};

function interpolateEmails(text: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    emailPlaceholders[name] ?? match,
  );
}

export function getServerLanguage(value: string | undefined): Language {
  if (value === "en" || value === "ro" || value === "de") return value;
  return "en";
}

export function tServer(language: Language, key: string): string {
  const text =
    translations[language][key] ?? translations.en[key] ?? key;
  return interpolateEmails(text);
}
