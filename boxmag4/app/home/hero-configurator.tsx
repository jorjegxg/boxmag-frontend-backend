"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "../i18n/language-context";

const SIZE_OPTIONS = [
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "1000",
];

export function HeroConfigurator() {
  const { t } = useLanguage();
  const labels = [
    t("home.hero.length"),
    t("home.hero.width"),
    t("home.hero.height"),
  ];
  const [selectedLength, setSelectedLength] = useState("400");
  const [selectedWidth, setSelectedWidth] = useState("400");
  const [selectedHeight, setSelectedHeight] = useState("400");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {labels.map((label, idx) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-black">
              {label}
            </span>
            <select
              value={
                idx === 0
                  ? selectedLength
                  : idx === 1
                    ? selectedWidth
                    : selectedHeight
              }
              onChange={(e) => {
                if (idx === 0) setSelectedLength(e.target.value);
                else if (idx === 1) setSelectedWidth(e.target.value);
                else setSelectedHeight(e.target.value);
              }}
              className="h-11 rounded-md border border-black/20 bg-white px-3 text-sm font-medium text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-my-blue focus:border-my-blue"
            >
              {SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}mm
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <Link
        href={{
          pathname: "/business",
          query: {
            length: selectedLength,
            width: selectedWidth,
            height: selectedHeight,
          },
        }}
        className="inline-flex items-center justify-center mt-4 bg-my-red hover:bg-my-blue text-white font-semibold text-sm lg:text-base px-6 lg:px-8 py-3 rounded-md shadow-md transition-colors"
      >
        {t("home.hero.getStarted")}
        <span className="ml-2 text-base">→</span>
      </Link>
    </div>
  );
}
