"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Language } from "./translations";
import { translations } from "./translations";
import { siteEmails } from "../../lib/site-emails";

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

function isLanguage(value: string | undefined | null): value is Language {
  return value === "en" || value === "ro" || value === "de";
}

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = "boxmag.language";

export function LanguageProvider({
  children,
  initialLanguage = "en",
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const fromCookie = document.cookie
      .match(/(?:^|; )boxmag\.language=(en|ro|de)/)?.[1];
    const fromStorage = localStorage.getItem(STORAGE_KEY);
    // Cookie wins: middleware sets it on /ro/* and /de/* redirects
    const saved = isLanguage(fromCookie)
      ? fromCookie
      : isLanguage(fromStorage)
        ? fromStorage
        : null;
    if (saved && saved !== language) {
      setLanguageState(saved);
    }
    setHydrated(true);
    // initialLanguage seeds first paint from server cookie; remount if cookie changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.lang = language;
    localStorage.setItem(STORAGE_KEY, language);
    document.cookie = `boxmag.language=${language}; path=/; max-age=31536000; samesite=lax`;
  }, [language, hydrated]);

  const value = useMemo<LanguageContextType>(
    () => ({
      language,
      setLanguage: setLanguageState,
      t: (key: string) =>
        interpolateEmails(
          translations[language][key] ?? translations.en[key] ?? key,
        ),
    }),
    [language],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
