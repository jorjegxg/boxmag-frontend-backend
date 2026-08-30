"use client";

import MyOutlinedButton from "../business/components/MyOutlinedButton";
import { useLanguage } from "../i18n/language-context";

export default function BoxfixSection({ onSeeNow }: { onSeeNow: () => void }) {
  const { t } = useLanguage();

  return (
    <section className="bg-my-light-gray2 py-16 px-6 lg:px-20 w-full">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-my-red text-2xl font-semibold  mb-4">
            {t("home.weOffer")}
          </p>

          <h1 className="text-5xl lg:text-6xl font-bold text-black mb-6">
            Box
            <span className="relative z-10">fix</span>
            <sup className="text-lg align-top">®</sup>
          </h1>

          <p className="text-lg mb-4">
            <span className="font-semibold">
              {t("home.boxfix.stopSendingAir")}
            </span>{" "}
            - {t("home.boxfix.costsLine")}
          </p>

          <p className="text-xl mb-8">{t("home.boxfix.offerLine")}</p>

          <MyOutlinedButton
            isSelected={false}
            onClick={onSeeNow}
            textOnTheButton={t("home.seeNow")}
            showArrow={true}
            reverseColors={true}
          />
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="bg-my-yellow rounded-3xl p-10 w-full max-w-md ">
            <img
              src="/placeholders/box4.png"
              alt="Boxfix packaging"
              className="w-full object-contain h-100"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
