"use client";

import type { Language } from "./i18n/translations";
import { LanguageProvider } from "./i18n/language-context";
import { CurrencyProvider } from "./currency/currency-context";
import { NotificationProvider } from "./global/components/notification-center";

export function Providers({
  children,
  initialLanguage = "en",
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
}) {
  return (
    <LanguageProvider initialLanguage={initialLanguage}>
      <CurrencyProvider>
        <NotificationProvider>{children}</NotificationProvider>
      </CurrencyProvider>
    </LanguageProvider>
  );
}
