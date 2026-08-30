"use client";

import Image from "next/image";
import MyOutlinedButton from "../business/components/MyOutlinedButton";
import { useLanguage } from "../i18n/language-context";

export default function CorrugatedEnvelopesSection({
  onSeeNow,
}: {
  onSeeNow: () => void;
}) {
  const { t } = useLanguage();

  return (
    <section className="bg-white w-full py-16 px-6 lg:px-20">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div className="relative flex justify-center lg:justify-start order-2 lg:order-1">
          <div className="bg-my-yellow rounded-3xl p-8 lg:p-10 w-full max-w-md aspect-4/5 flex items-center justify-center overflow-hidden">
            <Image
              src="/b2b/boxes/envelope.png"
              alt="Corrugated cardboard envelopes with box form capabilities"
              width={400}
              height={500}
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="flex flex-col items-start order-1 lg:order-2">
          <p className="text-my-red text-xl lg:text-2xl font-semibold mb-3 uppercase tracking-wide">
            {t("home.weOffer")}
          </p>
          <h2 className="text-3xl lg:text-5xl font-bold text-black mb-4 leading-tight uppercase">
            {t("home.corrugated.title")}
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            {t("home.corrugated.subtitle")}
          </p>
          <MyOutlinedButton
            isSelected={false}
            onClick={onSeeNow}
            textOnTheButton={t("home.seeNow")}
            showArrow={true}
            reverseColors={true}
          />
        </div>
      </div>
    </section>
  );
}
