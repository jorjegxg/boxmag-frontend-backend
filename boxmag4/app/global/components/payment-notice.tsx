"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "../../i18n/language-context";
import { siteEmails } from "../../../lib/site-emails";

/** Temporary notice at the very top of product pages: online checkout is not live yet. */
export function PaymentNotice() {
  const pathname = usePathname();
  const { t } = useLanguage();

  if (!pathname?.startsWith("/products/")) return null;

  return (
    <div
      role="status"
      className="w-full bg-my-yellow px-4 py-2.5 text-center text-sm font-medium leading-snug text-black"
    >
      {t("productNotice.before")}{" "}
      <Link
        href="/business"
        className="whitespace-nowrap rounded-md bg-my-blue px-2 py-0.5 font-bold uppercase text-white transition-colors hover:bg-my-blue/85"
      >
        {t("productNotice.link")} →
      </Link>{" "}
      {siteEmails.orders ? (
        <>
          {t("productNotice.middle")}{" "}
          <a
            href={`mailto:${siteEmails.orders}`}
            className="whitespace-nowrap font-bold underline underline-offset-2 hover:text-my-blue"
          >
            {siteEmails.orders}
          </a>
          .
        </>
      ) : null}
    </div>
  );
}
