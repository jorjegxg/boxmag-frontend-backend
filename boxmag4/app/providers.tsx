"use client";

import { LanguageProvider } from "./i18n/language-context";
import { NotificationProvider } from "./global/components/notification-center";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </LanguageProvider>
  );
}
