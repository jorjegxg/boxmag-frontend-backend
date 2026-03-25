"use client";

import { FaCube, FaTruck, FaLeaf } from "react-icons/fa";
import { useLanguage } from "../../i18n/language-context";

export function FeaturesSection() {
  const { t } = useLanguage();
  const FEATURE_CARDS = [
    {
      icon: FaCube,
      line1: t("features.1.line1"),
      line2: t("features.1.line2"),
      borderColor: "border-my-red",
      iconColor: "text-my-red",
    },
    {
      icon: FaTruck,
      line1: t("features.2.line1"),
      line2: t("features.2.line2"),
      borderColor: "border-my-blue",
      iconColor: "text-my-blue",
    },
    {
      icon: FaLeaf,
      line1: t("features.3.line1"),
      line2: t("features.3.line2"),
      borderColor: "border-teal-500",
      iconColor: "text-teal-500",
    },
  ];

  return (
    <section className="py-16 px-6 lg:px-20 w-full">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURE_CARDS.map(
            ({ icon: Icon, line1, line2, borderColor, iconColor }, i) => (
              <div
                key={i}
                className={`rounded-2xl border-2 ${borderColor} bg-white p-6 flex flex-row items-center gap-4`}
              >
                <Icon className={`w-14 h-14 shrink-0 ${iconColor}`} />
                <div className="text-left">
                  <p className="font-bold text-black text-lg uppercase leading-tight">
                    {line1}
                  </p>
                  <p className="font-bold text-black text-lg uppercase leading-tight">
                    {line2}
                  </p>
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
