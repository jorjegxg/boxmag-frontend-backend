"use client";

import Image from "next/image";
import { useLanguage } from "../i18n/language-context";

export default function ProducersBanner() {
  const { t } = useLanguage();

  return (
    <div className="flex justify-center items-center bg-my-red py-4 w-full">
      <div className="max-w-7xl mx-auto flex items-center gap-4 w-full px-4">
        <div className="flex-1 min-w-0 pr-4 text-white text-xl font-semibold">
          {t("home.producersBanner")}
          <span className="block text-sm font-normal mt-1">
            {t("home.producersBanner.rekoBefore")}{" "}
            <a
              href="https://rekopackaging.com"
              className="underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              REKOPACKAGING
            </a>{" "}
            {t("home.producersBanner.rekoAfter")}
          </span>
        </div>
        <div className="shrink-0 w-28 md:w-36">
          <Image
            src="/svgs/logo/logo_with_registered_mark_white.svg"
            alt="b2b"
            width={500}
            height={500}
            className="w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
}
