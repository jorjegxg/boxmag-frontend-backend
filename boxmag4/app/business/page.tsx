"use client";

import React, { useRef, useState } from "react";
import { IoIosArrowForward } from "react-icons/io";
import Link from "next/link";
import ResponsiveLayoutWithPadding from "../ResponsiveLayoutWithPadding";
import GridOfBoxes from "./components/GridOfBoxes";
import { CarboardType } from "./components/CarboardType";
import { CarboardColors } from "./components/CarboardColors";
import BoxPrintButtons from "./components/BoxPrintButtons";
import { TypeOfSizes } from "./components/TypeOfSizes";
import TransportOptions from "./components/TransportOptions";
import { MyInputField } from "./components/MyInputField";
import Quantity from "./components/Quantity";
import Image from "next/image";
import { B2b } from "../global/components/b2b";
import { ServicesSection } from "../global/components/services-section";
import { HaveAQuestion } from "../global/components/have-a-question";
import { NewsletterSubscribe } from "../global/components/newsletter-subscribe";
import { FaEnvelope, FaPhoneAlt, FaClock } from "react-icons/fa";
import { Bar } from "./components/Bar";
import { useRouter, useSearchParams } from "next/navigation";
import useBusinessStore from "./store/business_store";
import useBusinessOrderStore from "../stores/business_order_store";
import { useNotification } from "../global/components/notification-center";
import { useLanguage } from "../i18n/language-context";

const BussinessPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentName, setAttachmentName] = useState("");
  const [length, setLength] = useState(() => searchParams.get("length") ?? "");
  const [width, setWidth] = useState(() => searchParams.get("width") ?? "");
  const [height, setHeight] = useState(() => searchParams.get("height") ?? "");
  const [message, setMessage] = useState("");
  const [quantity, setQuantity] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const boxes = useBusinessStore((state) => state.boxes);
  const cardboardTypes = useBusinessStore((state) => state.carboarbonTypeOptions);
  const boxColors = useBusinessStore((state) => state.boxColorOptions);
  const boxPrintOptions = useBusinessStore((state) => state.boxPrintOptions);
  const typeOfSizes = useBusinessStore((state) => state.typeOfSizes);
  const transportOptions = useBusinessStore((state) => state.transportOptions);
  const setBusinessOrderDraft = useBusinessOrderStore((state) => state.setDraft);
  const { notify } = useNotification();
  const { t } = useLanguage();

  const hasAnyError = Object.keys(errors).length > 0;

  const validateAndContinue = () => {
    const nextErrors: Record<string, string> = {};
    const errorOrder = [
      "boxType",
      "cardboardType",
      "cardboardColor",
      "boxPrint",
      "sizeType",
      "length",
      "width",
      "height",
      "transport",
      "quantity",
      "terms",
      "message",
    ] as const;

    const sectionByError: Record<string, string> = {
      boxType: "section-box-type-cards",
      cardboardType: "section-cardboard-type-cards",
      cardboardColor: "section-cardboard-color",
      boxPrint: "section-box-print-cards",
      sizeType: "section-size-type-cards",
      length: "section-box-size",
      width: "section-box-size",
      height: "section-box-size",
      transport: "section-transport",
      quantity: "section-quantity",
      terms: "section-quantity",
      message: "section-message",
    };

    if (!boxes.some((box) => box.isSelected)) {
      nextErrors.boxType = t("business.errors.boxType");
    }
    if (!cardboardTypes.some((option) => option.isSelected)) {
      nextErrors.cardboardType = t("business.errors.cardboardType");
    }
    if (!boxColors.some((option) => option.isSelected)) {
      nextErrors.cardboardColor = t("business.errors.cardboardColor");
    }
    if (!boxPrintOptions.some((option) => option.isSelected)) {
      nextErrors.boxPrint = t("business.errors.boxPrint");
    }
    if (!typeOfSizes.some((option) => option.isSelected)) {
      nextErrors.sizeType = t("business.errors.sizeType");
    }

    if (!length.trim()) nextErrors.length = t("business.errors.lengthRequired");
    if (!width.trim()) nextErrors.width = t("business.errors.widthRequired");
    if (!height.trim()) nextErrors.height = t("business.errors.heightRequired");

    if (!transportOptions.some((option) => option.isSelected)) {
      nextErrors.transport = t("business.errors.transport");
    }
    if (!quantity.trim()) nextErrors.quantity = t("business.errors.quantityRequired");
    if (!message.trim()) nextErrors.message = t("business.errors.messageRequired");
    if (!acceptedTerms) nextErrors.terms = t("business.errors.terms");

    setErrors(nextErrors);

    const firstErrorKey = errorOrder.find((key) => nextErrors[key]);

    if (firstErrorKey) {
      notify({ type: "error", message: nextErrors[firstErrorKey] });
      const sectionId = sectionByError[firstErrorKey];
      const target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    if (Object.keys(nextErrors).length === 0) {
      setBusinessOrderDraft({
        length,
        width,
        height,
        quantity,
        message,
        attachmentName,
        acceptedTerms,
      });
      router.push("/order-summary");
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
          <span className="text-gray-700 font-semibold">{t("common.b2b")}</span>
        </div>
      </section>

      <div className="pt-8 md:pt-12 lg:pt-16" />
      <ResponsiveLayoutWithPadding>
        <Bar />
        <Pt16 />

        <div id="section-box-type">
          <RedTitle
            title={t("business.selectBoxType")}
            secondTitle={t("business.moreDetails")}
            link="/shop"
          />
        </div>
        {errors.boxType ? <p className="mt-3 text-sm text-red-600">{errors.boxType}</p> : null}
        <Pt16 />
        <div id="section-box-type-cards">
          <GridOfBoxes />
        </div>
        <Pt16 />

        <div id="section-cardboard-type">
          <RedTitle title={t("business.selectCardboardType")} />
        </div>
        {errors.cardboardType ? <p className="mt-3 text-sm text-red-600">{errors.cardboardType}</p> : null}
        <Pt16 />
        <div id="section-cardboard-type-cards">
          <CarboardType />
        </div>
        <Pt16 />

        <div id="section-cardboard-color">
          <RedTitle title={t("business.selectCardboardColor")} />
        </div>
        {errors.cardboardColor ? <p className="mt-3 text-sm text-red-600">{errors.cardboardColor}</p> : null}
        <Pt16 />
        <div id="section-cardboard-color-cards">
          <CarboardColors />
        </div>
        <Pt16 />

        <div id="section-box-print">
          <RedTitle title={t("business.boxPrint")} />
        </div>
        {errors.boxPrint ? <p className="mt-3 text-sm text-red-600">{errors.boxPrint}</p> : null}
        <Pt16 />
        <div id="section-box-print-cards">
          <BoxPrintButtons />
        </div>
        <Pt16 />

        <div id="section-size-type">
          <RedTitle title={t("business.typeOfSizes")} />
        </div>
        {errors.sizeType ? <p className="mt-3 text-sm text-red-600">{errors.sizeType}</p> : null}
        <Pt16 />
        <div id="section-size-type-cards">
          <TypeOfSizes />
        </div>
        <Pt16 />

        <div id="section-box-size">
          <RedTitle title={t("business.boxSize")} />
        </div>
        <Pt16 />
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-x-8">
          <MyInputField
            text={t("business.lengthMm")}
            id="package-length"
            type={"number"}
            placeholder={t("business.enterLengthMm")}
            value={length}
            onChange={setLength}
            error={errors.length}
          />
          <MyInputField
            text={t("business.widthMm")}
            id="package-width"
            type={"number"}
            placeholder={t("business.enterWidthMm")}
            value={width}
            onChange={setWidth}
            error={errors.width}
          />
          <MyInputField
            text={t("business.heightMm")}
            id="package-height"
            type="number"
            placeholder={t("business.enterHeightMm")}
            value={height}
            onChange={setHeight}
            error={errors.height}
          />
        </div>
        <Pt16 />

        <div id="section-transport">
          <RedTitle title={t("business.transport")} />
        </div>
        {errors.transport ? <p className="mt-3 text-sm text-red-600">{errors.transport}</p> : null}
        <Pt16 />
        <TransportOptions />

        <Pt16 />

        <div id="section-quantity">
          <RedTitle title={t("business.quantity")} />
        </div>
        <Pt16 />
        <Quantity
          quantity={quantity}
          onQuantityChange={setQuantity}
          acceptedTerms={acceptedTerms}
          onAcceptedTermsChange={setAcceptedTerms}
          quantityError={errors.quantity}
          termsError={errors.terms}
        />
        <Pt16 />

        <RedTitle title={t("business.attachment")} />
        <Pt16 />
        <div className="w-full max-w-md">
          <label htmlFor="pdf" className="block text-sm font-semibold text-gray-800 mb-2">
            {t("business.uploadFileOptional")}
          </label>
          <div className="flex rounded-xl border-2 border-gray-200 bg-white overflow-hidden focus-within:border-my-yellow focus-within:ring-2 focus-within:ring-my-yellow/30 transition-all">
            <input
              ref={fileInputRef}
              id="pdf"
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => setAttachmentName(e.target.files?.[0]?.name ?? "")}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 px-5 py-3.5 bg-my-yellow hover:bg-my-yellow-bright text-black font-semibold text-sm transition-colors"
            >
              {t("business.chooseFile")}
            </button>
            <span className="flex-1 min-w-0 px-4 py-3.5 text-gray-600 text-sm truncate border-l border-gray-200">
              {attachmentName || t("business.noFileChosen")}
            </span>
          </div>
          <p className="mt-2.5 text-sm text-my-gray">
            {t("business.maxFileSizePdf")}
          </p>
        </div>

        <Pt16 />

        <div id="section-message">
          <RedTitle title={t("business.message")} />
        </div>
        <Pt16 />
        <textarea
          className="w-full min-h-48 sm:min-h-60 p-3 rounded-lg border border-gray-300 bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red resize-y"
          placeholder={t("business.enterMessageHere")}
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        {errors.message ? <p className="mt-2 text-sm text-red-600">{errors.message}</p> : null}
        <Pt16 />

        <div className="flex justify-start">
          <button
            type="button"
            onClick={validateAndContinue}
            className="inline-flex items-center gap-2 bg-my-yellow hover:bg-my-yellow-bright text-black font-bold uppercase text-sm sm:text-base px-6 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-my-red focus:ring-offset-2"
          >
            {t("common.next")}
            <span aria-hidden>→</span>
          </button>
        </div>
        <Pt16 />
      </ResponsiveLayoutWithPadding>

      {/* Custom B2B Professionals section */}
      <section className="w-full bg-my-blue py-4 px-6 lg:px-20">
        <div className="max-w-4xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-5 lg:gap-8">
          <div className="flex items-center gap-3 text-center lg:text-left">
            <div className="shrink-0 bg-my-yellow rounded-xl h-10 w-10 lg:h-11 lg:w-11 flex items-center justify-center shadow-md border-2 border-white/30">
              <Image
                src="/svgs/shake_hands.svg"
                alt=""
                width={22}
                height={22}
                className="w-5 h-5 lg:w-6 lg:h-6"
              />
            </div>
            <div>
              <h2 className="text-white text-base lg:text-lg font-normal uppercase tracking-wide">
                B2B <span className="font-bold">{t("b2b.professionals")}</span>
              </h2>
              <p className="text-white/95 text-xs lg:text-sm mt-0.5">
                {t("b2b.tagline")}
              </p>
            </div>
          </div>
          <div className="lg:border-l lg:border-white/20 lg:pl-8 flex flex-col items-center lg:items-start text-center lg:text-left">
            <p className="text-my-yellow font-semibold text-sm lg:text-base mb-2">
              {t("business.needMoreInfo")}
            </p>
            <div className="space-y-1.5 text-white text-sm">
              <a
                href="mailto:B2B@boxmag.eu"
                className="flex items-center justify-center lg:justify-start gap-3 hover:text-my-yellow transition-colors"
              >
                <FaEnvelope className="w-4 h-4 text-my-yellow shrink-0" />
                <span>B2B@boxmag.eu</span>
              </a>
              <a
                href="tel:+40799553345"
                className="flex items-center justify-center lg:justify-start gap-3 hover:text-my-yellow transition-colors"
              >
                <FaPhoneAlt className="w-4 h-4 text-my-yellow shrink-0" />
                <span>+40 799 553 345</span>
              </a>
              <div className="flex items-center justify-center lg:justify-start gap-3">
                <FaClock className="w-4 h-4 text-my-yellow shrink-0" />
                <span>MO-FRI 08:00 - 16:30</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ServicesSection />
      <HaveAQuestion />
      <NewsletterSubscribe />
    </div>
  );

  function Pt16() {
    return <div className="pt-8 md:pt-12 lg:pt-16" />;
  }

  function RedTitle({
    secondTitle,
    title,
    link,
  }: {
    secondTitle?: string;
    title: string;
    link?: string;
  }) {
    return (
      <div className="bg-my-red w-full flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-3 sm:pl-8 sm:pr-4 sm:py-4 rounded-lg text-my-white">
        <span className="font-bold text-base sm:text-lg">{title}</span>
        {secondTitle && (
          <Link
            className="flex items-center group shrink-0 hover:underline"
            href={link ?? "#"}
          >
            <span className="text-sm sm:text-base">{secondTitle}</span>
            <IoIosArrowForward className="ml-0.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
    );
  }
};

export default BussinessPage;
