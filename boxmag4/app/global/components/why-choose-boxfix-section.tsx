"use client";

import { FaCheck } from "react-icons/fa";
import { useLanguage } from "../../i18n/language-context";

export function WhyChooseBoxfixSection() {
  const { t } = useLanguage();
  const WHY_CHOOSE_ITEMS = [
    t("whyChoose.item1"),
    t("whyChoose.item2"),
    t("whyChoose.item3"),
    t("whyChoose.item4"),
    t("whyChoose.item5"),
    t("whyChoose.item6"),
  ];

  return (
    <section className="bg-my-light-gray2 py-16 px-6 lg:px-20 w-full">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        {/* LEFT: Title + bullet list */}
        <div>
          <h2 className="text-my-red text-2xl lg:text-3xl font-bold uppercase mb-8">
            {t("whyChoose.title")}<sup className="align-top text-lg">®</sup>?
          </h2>
          <ul className="space-y-4">
            {WHY_CHOOSE_ITEMS.map((text, i) => (
              <li key={i} className="flex gap-3 items-start text-gray-800">
                <span className="shrink-0 mt-0.5 text-teal-500">
                  <FaCheck className="w-5 h-5" />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* RIGHT: Orange block with 3 box images collage */}
        <div className="flex justify-center lg:justify-end">
          <div className="bg-my-yellow rounded-3xl p-8 w-full max-w-lg relative min-h-[320px] flex items-center justify-center">
            <img
              src="/b2b/boxes/open-box.png"
              alt="REKO Packaging box open"
              className="absolute top-8 left-8 w-2/5 max-w-[140px] object-contain drop-shadow-md"
            />
            <img
              src="/placeholders/box.png"
              alt="REKO Packaging box closed"
              className="absolute top-8 right-8 w-2/5 max-w-[140px] object-contain drop-shadow-md"
            />
            <img
              src="/b2b/boxes/sqashed.png"
              alt="REKO Packaging box flat"
              className="absolute bottom-8 left-1/2 -translate-x-1/2 w-2/5 max-w-[180px] object-contain drop-shadow-md"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
