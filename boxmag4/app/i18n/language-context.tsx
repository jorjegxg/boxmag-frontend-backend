"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Language } from "./translations";
import { translations } from "./translations";

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = "boxmag.language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "ro" || saved === "de") {
      setLanguageState(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem(STORAGE_KEY, language);
    document.cookie = `boxmag.language=${language}; path=/; max-age=31536000; samesite=lax`;
  }, [language]);

  const value = useMemo<LanguageContextType>(
    () => ({
      language,
      setLanguage: setLanguageState,
      t: (key: string) => translations[language][key] ?? translations.en[key] ?? key,
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
