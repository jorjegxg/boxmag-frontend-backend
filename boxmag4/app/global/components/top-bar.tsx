"use client";

import { useEffect, useState } from "react";
import { FaEnvelope, FaPhoneAlt, FaFax } from "react-icons/fa";
import { useLanguage } from "../../i18n/language-context";
import { useCurrency } from "../../currency/currency-context";
import { siteEmails } from "../../../lib/site-emails";
import type { Language } from "../../i18n/translations";
import type { DisplayCurrency } from "../../../lib/format-price";

export function TopBar() {
  const { language, setLanguage, t } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  const [shippingTo, setShippingTo] = useState("RO");

  useEffect(() => {
    const savedShipping = localStorage.getItem("boxmag.shippingTo");
    if (savedShipping) setShippingTo(savedShipping);
  }, []);

  useEffect(() => {
    localStorage.setItem("boxmag.shippingTo", shippingTo);
  }, [shippingTo]);

  return (
    <div className="w-full border-b border-my-light-gray bg-white text-s text-black">
      {/* i want to not wrap the text in full width on laptop */}
      <div className=" max-w-7xl mx-auto grid grid-cols-1 place-items-center gap-3 px-4 py-2 lg:flex lg:place-items-stretch lg:flex-row lg:items-center lg:justify-between max-md:hidden ">
        {/* Left: contact info */}
        <div className="flex flex-nowrap text-xs gap-x-4 max-lg:w-full ">
          <a
            href={`mailto:${siteEmails.info}`}
            className="flex shrink-0 items-center gap-1 whitespace-nowrap hover:underline"
          >
            <FaEnvelope className="text-my-red shrink-0" />
            <span>{siteEmails.info}</span>
          </a>
          <a
            href="tel:+40799553345"
            className="flex shrink-0 items-center gap-1 whitespace-nowrap hover:underline"
          >
            <FaPhoneAlt className="text-my-red shrink-0" />
            <span>+40 799 553 345</span>
          </a>
          <a
            href="tel:+40230565997"
            className="flex shrink-0 items-center gap-1 whitespace-nowrap hover:underline"
          >
            <FaFax className="text-my-red shrink-0" />
            <span>+40 230 565 997</span>
          </a>
        </div>

        {/* Right: selectors */}
        <div
          className="flex max-md:flex-col 
       max-md:grid max-md:grid-cols-2 
        lg:justify-center lg:gap-x-4 w-full"
        >
          <Selector
            label={t("topBar.type")}
            value={t("topBar.company")}
            options={[t("topBar.company")]}
          />
          <Selector
            label={t("topBar.language")}
            value={language.toUpperCase()}
            options={["EN", "RO", "DE"]}
            onChange={(value) => {
              const next = value.toLowerCase() as Language;
              if (next === "en" || next === "ro" || next === "de") {
                setLanguage(next);
              }
            }}
          />
          <Selector
            label={t("topBar.shippingTo")}
            value={shippingTo}
            options={["RO", "BG", "HU", "PL", "DE"]}
            onChange={setShippingTo}
          />
          <Selector
            label={t("topBar.currency")}
            value={currency.toUpperCase()}
            options={["EUR", "RON"]}
            onChange={(value) => {
              const next = value.toLowerCase() as DisplayCurrency;
              if (next === "eur" || next === "ron") {
                setCurrency(next);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

type SelectorProps = {
  label: string;
  value: string;
  options: string[];
  onChange?: (value: string) => void;
};

function Selector({ label, value, options, onChange }: SelectorProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-my-gray shrink-0">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="rounded-sm border border-my-light-gray bg-white px-2 py-0.5 text-[11px] font-medium text-black focus:outline-none focus:ring-1 focus:ring-my-blue"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
