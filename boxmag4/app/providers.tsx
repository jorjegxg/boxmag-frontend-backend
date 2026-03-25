"use client";

import { LanguageProvider } from "./i18n/language-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
