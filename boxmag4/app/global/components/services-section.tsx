"use client";

import { FaShoppingCart, FaImage, FaBoxOpen } from "react-icons/fa";
import { useLanguage } from "../../i18n/language-context";

export function ServicesSection() {
  const { t } = useLanguage();
  const SERVICE_ITEMS = [
    {
      icon: FaShoppingCart,
      title: t("services.1.title"),
      description: t("services.1.desc"),
      bgColor: "bg-my-yellow",
    },
    {
      icon: FaImage,
      title: t("services.2.title"),
      description: t("services.2.desc"),
      bgColor: "bg-my-red",
    },
    {
      icon: FaBoxOpen,
      title: t("services.3.title"),
      description: t("services.3.desc"),
      bgColor: "bg-teal-500",
    },
  ];

  return (
    <section className="bg-my-light-gray2 py-16 px-6 lg:px-20 w-full">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {SERVICE_ITEMS.map(
          ({ icon: Icon, title, description, bgColor }, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div
                className={`${bgColor} rounded-2xl w-16 h-16 flex items-center justify-center mb-4`}
              >
                <Icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-black text-lg uppercase mb-2">
                {title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed max-w-xs">
                {description}
              </p>
            </div>
          ),
        )}
      </div>
    </section>
  );
}
