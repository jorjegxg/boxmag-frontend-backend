"use client";

import Image from "next/image";
import Link from "next/link";
import { FaArrowRight } from "react-icons/fa";
import { useLanguage } from "../../i18n/language-context";

export function HaveAQuestion() {
  const { t } = useLanguage();

  return (
    <section className="bg-my-cream-colored w-full py-16 px-6 lg:px-20">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        {/* Left: illustration */}
        <div className="flex justify-center lg:justify-start">
          <Image
            src="svgs/contact_us_yellow.svg"
            alt="Contact us - get in touch"
            width={500}
            height={500}
            className="w-full max-w-md h-auto object-contain"
          />
        </div>
        {/* Right: heading, bullet list, CTA */}
        <div className="flex flex-col items-start">
          <h2 className="text-2xl lg:text-4xl font-bold text-my-red mb-6">
            {t("question.title")}
          </h2>
          <ul className="space-y-2 text-base lg:text-lg text-black mb-8">
            <li>{t("question.item1")}</li>
            <li>{t("question.item2")}</li>
            <li>{t("question.item3")}</li>
          </ul>
          <Link
            href="/contact"
            className="w-fit text-lg rounded-lg font-semibold border border-my-yellow max-sm:px-4 sm:px-12 py-2 gap-2 flex items-center justify-center text-center bg-my-yellow hover:bg-white transition-colors"
          >
            {t("question.cta")}
            <FaArrowRight />
          </Link>
        </div>
      </div>
    </section>
  );
}
