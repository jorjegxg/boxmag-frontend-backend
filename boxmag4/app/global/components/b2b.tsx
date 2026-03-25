"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "../../i18n/language-context";

export function B2b() {
  const { t, language } = useLanguage();

  return (
    <div className="bg-my-blue w-full h-16 overflow-visible flex items-center justify-center px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-8 w-full">
        {/* Left: icon with light border */}
        <div className="shrink-0">
          <span className="bg-my-yellow rounded-xl h-11 w-11 lg:h-12 lg:w-12 flex items-center justify-center shadow-md border-2 border-white/30">
            <Image
              src="svgs/shake_hands.svg"
              alt="B2B handshake"
              width={24}
              height={24}
              className="lg:w-7 lg:h-7"
            />
          </span>
        </div>

        {/* Center: B2B PROFESSIONALS + tagline */}
        <div className="flex flex-col justify-center text-center">
          <div className="font-bold text-sm lg:text-base tracking-wide uppercase">
            {language === "ro" ? (
              <>
                <span className="text-my-yellow">{t("b2b.professionals")} </span>
                <span className="text-white">B2B</span>
              </>
            ) : (
              <>
                <span className="text-white">B2B </span>
                <span className="text-my-yellow">{t("b2b.professionals")}</span>
              </>
            )}
          </div>
          <p className="text-white text-xs lg:text-sm font-normal mt-0.5">
            {t("b2b.tagline")}
          </p>
        </div>

        {/* Right: ENTER button */}
        <div className="shrink-0">
          <Link
            href="/business"
            className="bg-my-yellow hover:bg-my-yellow-bright text-black font-bold uppercase text-xs lg:text-sm px-4 py-2 rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            {t("b2b.enter")}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
