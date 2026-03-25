"use client";

import Image from "next/image";
import Link from "next/link";
import { FaSearch } from "react-icons/fa";
import { useLanguage } from "../../i18n/language-context";

export function Header() {
  const { t, language } = useLanguage();

  return (
    <header className="w-full border-b border-my-light-gray bg-white">
      <div className="max-w-7xl mx-auto px-4 py-4 lg:px-8 flex gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="/svgs/logo/boxmag_logo.svg"
            alt="BOXMAG"
            width={160}
            height={48}
            className="h-10 w-auto lg:h-12"
          />
        </Link>
        {/* expanded space on mobile */}
        <div className="max-md:flex-1 "></div>

        {/* Search bar - center on desktop */}
        <div className="  max-w-xl mx-auto lg:mx-8 w-full max-md:hidden">
          <form
            role="search"
            className="relative flex items-center"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="search"
              placeholder={t("header.searchPlaceholder")}
              className="w-full rounded-lg border border-my-light-gray bg-white py-2.5 pl-4 pr-10 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-my-blue focus:border-my-blue"
              aria-label={t("header.searchAria")}
            />
            <span className="absolute right-3 pointer-events-none text-my-red">
              <FaSearch className="h-5 w-5" />
            </span>
          </form>
        </div>

        {/* Cart + User */}
        <div className="flex items-center justify-center gap-6 lg:gap-8 shrink-0">
          {/* Cart */}
          <Link
            href="/checkout"
            className="flex flex-col items-center gap-0.5 hover:opacity-80 transition-opacity"
          >
            <span className="relative inline-block">
              <Image
                src="/svgs/cart.svg"
                alt=""
                width={64}
                height={64}
                className="h-6 w-6"
              />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-my-red text-[10px] font-bold text-white">
                1
              </span>
            </span>
            <span className="text-xs font-medium text-black">{t("header.cart")}</span>
            <span className="text-xs font-bold text-black">€ 300.00</span>
          </Link>

          {/* User */}
          <Link
            href="/account"
            className="flex flex-col items-center gap-0.5 hover:opacity-80 transition-opacity"
          >
            <Image
              src="/svgs/user.svg"
              alt=""
              width={64}
              height={64}
              className="h-6 w-6"
            />
            {language === "ro" ? (
              <>
                <span className="text-xs font-medium text-black">{t("header.account")}</span>
                <span className="text-xs font-medium text-black">{t("header.user").toLowerCase()}</span>
              </>
            ) : (
              <>
                <span className="text-xs font-medium text-black">{t("header.user")}</span>
                <span className="text-xs font-medium text-black">{t("header.account")}</span>
              </>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
