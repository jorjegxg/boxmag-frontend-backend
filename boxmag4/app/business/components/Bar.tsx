"use client";

import React from "react";
import { useLanguage } from "../../i18n/language-context";

function Step({ number, isLast }: { number: number; isLast?: boolean }) {
  const { t } = useLanguage();
  const steps = [
    { step: 1, title: t("business.steps.chooseBoxType"), active: true },
    { step: 2, title: t("business.steps.setParameters") },
    { step: 3, title: t("business.steps.sendContactDetails") },
  ];

  return (
    <div className="relative flex flex-1 min-w-0 flex-col items-center h-full">
      {/* Circle */}
      <div className="relative z-10 grid h-7 w-7 place-items-center rounded-full bg-my-yellow text-xs font-bold ">
        {number}
      </div>

      {/* Connector line to next (aligned with circle) */}
      {!isLast && (
        <div className="absolute left-1/2 top-2.75 h-1.5 w-full bg-my-yellow " />
      )}

      <Card step={number} title={steps[number - 1].title} />
    </div>
  );
}

function Card({ step, title }: { step: number; title: string }) {
  const { t } = useLanguage();

  return (
    <div className="relative mt-6 flex-1 flex flex-col min-h-0 w-full max-w-[240px] min-w-0 rounded-xl border-2 border-my-yellow px-4 py-4 sm:px-6 sm:py-6 text-center shadow-sm sm:max-w-60">
      {/* notch */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full pointer-events-none">
        <div className="h-0 w-0 border-l-14 border-r-14 border-b-14 border-l-transparent border-r-transparent border-b-my-yellow" />
        <div className="absolute left-1/2 top-0.5 h-0 w-0 -translate-x-1/2 border-l-12 border-r-12 border-b-12 border-l-transparent border-r-transparent border-b-transparent" />
      </div>

      <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-my-gray">
        {t("business.step")} {step}
      </div>

      <div className="mt-2 whitespace-pre-line text-xs sm:text-sm font-extrabold leading-snug min-h-18 sm:min-h-0">
        {title}
      </div>
    </div>
  );
}

export function Bar() {
  const { t } = useLanguage();

  return (
    <div className="px-2 sm:px-6 overflow-x-auto">
      <div className="flex items-stretch justify-between min-w-[280px] sm:min-w-0 gap-2 sm:gap-4">
        <Step number={1} />
        <Step number={2} />
        <Step number={3} isLast />
      </div>
      <p className="mt-4 text-center text-sm sm:text-base text-my-gray font-medium">
        {t("business.relaxMessage")}
      </p>
    </div>
  );
}
