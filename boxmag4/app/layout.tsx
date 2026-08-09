import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Footer } from "./global/components/footer";
import { Header } from "./global/components/header";
import { TopBar } from "./global/components/top-bar";
import { getSiteBaseUrl } from "../lib/site-url";
import { Providers } from "./providers";
import type { Language } from "./i18n/translations";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteBaseUrl()),
  title: "Boxmag",
  description: "Cutii din carton ondulat — producător și magazin online",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

function resolveLanguage(value: string | undefined): Language {
  if (value === "en" || value === "ro" || value === "de") return value;
  return "en";
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLanguage = resolveLanguage(
    cookieStore.get("boxmag.language")?.value,
  );

  return (
    <html lang={initialLanguage}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased `}
      >
        <Providers initialLanguage={initialLanguage}>
          <TopBar />
          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
