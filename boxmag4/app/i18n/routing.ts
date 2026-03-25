import type { Language } from "./translations";

export const LOCALE_PREFIXES: Record<Language, string> = {
  en: "",
  ro: "/ro",
  de: "/de",
};

export function getLanguageFromPathname(pathname: string): Language {
  if (pathname === "/ro" || pathname.startsWith("/ro/")) return "ro";
  if (pathname === "/de" || pathname.startsWith("/de/")) return "de";
  return "en";
}

export function stripLocalePrefix(pathname: string): string {
  if (pathname === "/ro" || pathname === "/de") return "/";
  if (pathname.startsWith("/ro/")) return pathname.slice(3) || "/";
  if (pathname.startsWith("/de/")) return pathname.slice(3) || "/";
  return pathname;
}

export function withLocalePrefix(pathname: string, language: Language): string {
  const basePath = stripLocalePrefix(pathname);
  const prefix = LOCALE_PREFIXES[language];
  if (!prefix) return basePath;
  return basePath === "/" ? prefix : `${prefix}${basePath}`;
}
