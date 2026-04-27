"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { B2b } from "../global/components/b2b";
import ResponsiveLayoutWithPadding from "../ResponsiveLayoutWithPadding";
import { Bar } from "../business/components/Bar";
import { B2bProfessionalsSection } from "../business/components/B2bProfessionalsSection";
import { ServicesSection } from "../global/components/services-section";
import { HaveAQuestion } from "../global/components/have-a-question";
import { NewsletterSubscribe } from "../global/components/newsletter-subscribe";
import useBusinessStore from "../business/store/business_store";
import { useLanguage } from "../i18n/language-context";
import useBusinessOrderStore from "../stores/business_order_store";
import { useNotification } from "../global/components/notification-center";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red";
const shouldAutofillOrderSummary =
  process.env.NEXT_PUBLIC_CONTACT_FORM_MODE?.toLowerCase() === "dev";

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-wrap justify-between items-baseline gap-x-4 gap-y-1 py-2.5 border-b border-gray-200 last:border-b-0">
      <span className="font-bold text-gray-800">{label}</span>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}

export default function OrderSummaryPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { notify } = useNotification();
  const [firstName, setFirstName] = useState(shouldAutofillOrderSummary ? "John" : "");
  const [surname, setSurname] = useState(shouldAutofillOrderSummary ? "Doe" : "");
  const [companyName, setCompanyName] = useState(
    shouldAutofillOrderSummary ? "Boxmag Test SRL" : "",
  );
  const [vatNumber, setVatNumber] = useState(
    shouldAutofillOrderSummary ? "RO12345678" : "",
  );
  const [email, setEmail] = useState(
    shouldAutofillOrderSummary ? "yotrevorgxg@gmail.com" : "",
  );
  const [phone, setPhone] = useState(
    shouldAutofillOrderSummary ? "+40799111222" : "",
  );
  const [address, setAddress] = useState(
    shouldAutofillOrderSummary ? "Stefan cel Mare 131" : "",
  );
  const [postcode, setPostcode] = useState(shouldAutofillOrderSummary ? "725400" : "");
  const [city, setCity] = useState(shouldAutofillOrderSummary ? "Radauti" : "");
  const [country, setCountry] = useState(shouldAutofillOrderSummary ? "RO" : "");
  const [createAccount, setCreateAccount] = useState(shouldAutofillOrderSummary);
  const [consentPhone, setConsentPhone] = useState(shouldAutofillOrderSummary);
  const [consentEmail, setConsentEmail] = useState(shouldAutofillOrderSummary);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const boxes = useBusinessStore((s) => s.boxes);
  const carboardTypes = useBusinessStore((s) => s.carboarbonTypeOptions);
  const boxColors = useBusinessStore((s) => s.boxColorOptions);
  const boxPrints = useBusinessStore((s) => s.boxPrintOptions);
  const typeOfSizes = useBusinessStore((s) => s.typeOfSizes);
  const transportOptions = useBusinessStore((s) => s.transportOptions);
  const draft = useBusinessOrderStore((s) => s.draft);

  const selectedBox = boxes.find((b) => b.isSelected);
  const selectedType = carboardTypes.find((t) => t.isSelected);
  const selectedColor = boxColors.find((c) => c.isSelected);
  const selectedPrint = boxPrints.find((p) => p.isSelected);
  const selectedSizeType = typeOfSizes.find((t) => t.isSelected);
  const selectedTransport = transportOptions.find((t) => t.isSelected);
  const backendBaseUrl = (() => {
    const value = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
    if (!value) return "http://localhost:3005";
    return value.endsWith("/") ? value.slice(0, -1) : value;
  })();

  const orderRows = [
    { label: t("orderSummary.boxType"), value: selectedBox?.name ?? "—" },
    { label: t("orderSummary.cardboardType"), value: selectedType?.name ?? "—" },
    { label: t("orderSummary.cardboardColour"), value: selectedColor?.name ?? "—" },
    {
      label: t("orderSummary.boxPrint"),
      value: selectedPrint ? (selectedPrint.name === "1 Color" ? "1 Colour" : selectedPrint.name) : "—",
    },
    {
      label: t("orderSummary.boxSize"),
      value:
        draft.length && draft.width && draft.height
          ? `${draft.length} x ${draft.width} x ${draft.height} mm${selectedSizeType ? ` (${selectedSizeType.name})` : ""}`
          : "—",
    },
    { label: t("orderSummary.transport"), value: selectedTransport?.name ?? "—" },
    { label: t("orderSummary.quantity"), value: draft.quantity || "—" },
    { label: t("orderSummary.ftl"), value: t("orderSummary.no") },
    {
      label: t("orderSummary.attachment"),
      value: draft.attachmentName ? draft.attachmentName : t("orderSummary.no"),
    },
    {
      label: t("orderSummary.message"),
      value: draft.message ? draft.message : t("orderSummary.no"),
    },
  ];

  const handleSubmitOrder = async () => {
    const requiredContactFields = [
      firstName,
      surname,
      companyName,
      email,
      phone,
      address,
      postcode,
      city,
      country,
    ];

    if (requiredContactFields.some((value) => value.trim().length === 0)) {
      notify({
        type: "error",
        message: "Please complete all required contact fields before sending the order.",
      });
      return;
    }

    if (!draft.acceptedTerms) {
      notify({
        type: "error",
        message: "Please accept terms in Step 2 before sending the order.",
      });
      return;
    }

    if (!selectedBox || !selectedType || !selectedColor || !selectedPrint || !selectedSizeType || !selectedTransport) {
      notify({
        type: "error",
        message: "Order details are incomplete. Please return to Step 2 and complete all fields.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${backendBaseUrl}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          boxTypeId: selectedBox.id,
          boxTypeName: selectedBox.name,
          cardboardType: selectedType.name,
          cardboardColour: selectedColor.name,
          boxPrint: selectedPrint.name === "1 Color" ? "1 Colour" : selectedPrint.name,
          lengthMm: draft.length,
          widthMm: draft.width,
          heightMm: draft.height,
          sizeType: selectedSizeType.name,
          transport: selectedTransport.name,
          quantity: draft.quantity,
          ftl: false,
          attachmentName: draft.attachmentName || null,
          message: draft.message,
          acceptedTerms: draft.acceptedTerms,
          firstName,
          surname,
          companyName,
          vatNumber: vatNumber || null,
          email,
          phone,
          address,
          postcode,
          city,
          country,
          createAccount,
          consentPhone,
          consentEmail,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.message ?? `Failed with status ${response.status}`);
      }

      notify({
        type: "success",
        message: "Order sent successfully.",
      });
      router.push("/");
    } catch (error) {
      notify({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to send order.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <B2b />

      {/* Path section */}
      <section className="w-full bg-white px-4 sm:px-6 lg:px-20 pt-6">
        <div className="max-w-7xl mx-auto text-xs lg:text-sm text-gray-500 uppercase tracking-wide">
          <Link href="/" className="hover:underline">
            {t("common.home")}
          </Link>{" "}
          <span className="mx-2">→</span>
          <Link href="/business" className="hover:underline">
            {t("common.b2b")}
          </Link>{" "}
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">{t("orderSummary.title")}</span>
        </div>
      </section>

      <div className="pt-8 md:pt-12 lg:pt-16" />
      <ResponsiveLayoutWithPadding>
        <Bar />

        <div className="pt-8 md:pt-12 lg:pt-16" />

        {/* Order Summary bar */}
        <div className="bg-my-red w-full flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-3 sm:pl-8 sm:pr-4 sm:py-4 rounded-t-lg text-my-white">
          <span className="font-bold text-base sm:text-lg">{t("orderSummary.title")}</span>
        </div>

        {/* Order details list */}
        <div className="w-full rounded-b-lg border-2 border-t-0 border-my-light-gray bg-white px-6 py-4 sm:px-8 sm:py-5 text-gray-800">
          {orderRows.map((row) => (
            <SummaryRow key={row.label} label={row.label} value={row.value} />
          ))}
        </div>

        <div className="pt-8 md:pt-12 lg:pt-16" />

        {/* Picture 1: Contact form */}
        <div className="bg-my-red w-full flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-3 sm:pl-8 sm:pr-4 sm:py-4 rounded-t-lg text-my-white">
          <span className="font-bold text-base sm:text-lg">{t("orderSummary.contact")}</span>
        </div>
        <div className="w-full rounded-b-lg border-2 border-t-0 border-my-light-gray bg-white px-6 py-6 sm:px-8 sm:py-8">
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="os-firstName" className="block text-sm font-semibold text-gray-800 mb-1">{t("orderSummary.firstName")}</label>
                <input id="os-firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t("orderSummary.firstName")} className={inputClass} />
              </div>
              <div>
                <label htmlFor="os-surname" className="block text-sm font-semibold text-gray-800 mb-1">{t("orderSummary.surname")}</label>
                <input id="os-surname" type="text" value={surname} onChange={(e) => setSurname(e.target.value)} placeholder={t("orderSummary.surname")} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="os-companyName" className="block text-sm font-semibold text-gray-800 mb-1">{t("orderSummary.companyName")}</label>
                <input id="os-companyName" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder={t("orderSummary.companyName")} className={inputClass} />
              </div>
              <div>
                <label htmlFor="os-vatNumber" className="block text-sm font-semibold text-gray-800 mb-1">{t("orderSummary.vatNumber")}</label>
                <input id="os-vatNumber" type="text" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder={t("orderSummary.vatNumber")} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="os-email" className="block text-sm font-semibold text-gray-800 mb-1">{t("orderSummary.email")}</label>
                <input id="os-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourwebsite.com" className={inputClass} />
              </div>
              <div>
                <label htmlFor="os-phone" className="block text-sm font-semibold text-gray-800 mb-1">{t("orderSummary.phone")}</label>
                <input id="os-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("orderSummary.phone")} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="os-address" className="block text-sm font-semibold text-gray-800 mb-1">{t("orderSummary.address")}</label>
                <input id="os-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t("orderSummary.address")} className={inputClass} />
              </div>
              <div>
                <label htmlFor="os-postcode" className="block text-sm font-semibold text-gray-800 mb-1">{t("orderSummary.postcode")}</label>
                <input id="os-postcode" type="text" value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder={t("orderSummary.postcode")} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="os-city" className="block text-sm font-semibold text-gray-800 mb-1">{t("orderSummary.city")}</label>
                <input id="os-city" type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("orderSummary.city")} className={inputClass} />
              </div>
              <div>
                <label htmlFor="os-country" className="block text-sm font-semibold text-gray-800 mb-1">{t("orderSummary.country")}</label>
                <select id="os-country" value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass}>
                  <option value="">{t("orderSummary.country")}</option>
                  <option value="RO">Romania</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="IT">Italy</option>
                  <option value="ES">Spain</option>
                  <option value="NL">Netherlands</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        <div className="pt-8 md:pt-12 lg:pt-16" />

        {/* Picture 2: Checkboxes and PREV/NEXT */}
        <div className="w-full space-y-4">
          <label className="flex gap-3 items-start cursor-pointer">
            <input type="checkbox" checked={createAccount} onChange={(e) => setCreateAccount(e.target.checked)} className="mt-1 h-5 w-5 rounded border-2 border-gray-300 bg-white accent-my-red focus:ring-my-red" />
            <span className="text-sm text-gray-700">{t("orderSummary.createAccount")}</span>
          </label>
          <label className="flex gap-3 items-start cursor-pointer">
            <input type="checkbox" checked={consentPhone} onChange={(e) => setConsentPhone(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 rounded border-2 border-gray-300 bg-white accent-my-red focus:ring-my-red" />
            <span className="text-sm text-gray-600">
              {t("orderSummary.consentPhone")}
            </span>
          </label>
          <label className="flex gap-3 items-start cursor-pointer">
            <input type="checkbox" checked={consentEmail} onChange={(e) => setConsentEmail(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 rounded border-2 border-gray-300 bg-white accent-my-red focus:ring-my-red" />
            <span className="text-sm text-gray-600">
              {t("orderSummary.consentEmail")}
            </span>
          </label>
          <div className="flex flex-wrap justify-between gap-4 pt-4">
            <Link href="/business" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-my-red hover:bg-my-red/90 text-white font-semibold transition-colors">
              <span>←</span> {t("common.prev")}
            </Link>
            <button
              type="button"
              onClick={() => void handleSubmitOrder()}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-my-red hover:bg-my-red/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold transition-colors"
            >
              {isSubmitting ? "Sending..." : t("common.next")} <span>→</span>
            </button>
          </div>
        </div>

        <div className="pt-8 md:pt-12 lg:pt-16" />
      </ResponsiveLayoutWithPadding>

      <B2bProfessionalsSection />

      {/* Thank you banner */}
      <section className="w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pictures/thank-you-banner.png" alt="Thank you for shopping" className="w-full h-auto object-cover" />
      </section>

      <ServicesSection />
      <HaveAQuestion />
      <NewsletterSubscribe />
    </div>
  );
}
