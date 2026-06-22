"use client";

import { LanguageProvider } from "./i18n/language-context";
import { CurrencyProvider } from "./currency/currency-context";
import { NotificationProvider } from "./global/components/notification-center";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <CurrencyProvider>
        <NotificationProvider>{children}</NotificationProvider>
      </CurrencyProvider>
    </LanguageProvider>
  );
}
