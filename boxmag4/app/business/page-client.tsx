"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { B2b } from "../global/components/b2b";
import { ServicesSection } from "../global/components/services-section";
import { HaveAQuestion } from "../global/components/have-a-question";
import { NewsletterSubscribe } from "../global/components/newsletter-subscribe";
import { Bar } from "./components/Bar";
import { B2bProfessionalsSection } from "./components/B2bProfessionalsSection";
import { useRouter, useSearchParams } from "next/navigation";
import useBusinessStore from "./store/business_store";
import useBusinessOrderStore from "../stores/business_order_store";
import { useNotification } from "../global/components/notification-center";
import { getBackendBaseUrl } from "../../lib/backend-url";
import { isDevelopmentAppEnv } from "../../lib/app-env";
import { useLanguage } from "../i18n/language-context";

const MAX_ATTACHMENT_BYTES = 18 * 1024 * 1024;

function isPositiveNumber(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1;
}

const BussinessPage = () => {
  const isDevelopment = isDevelopmentAppEnv();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentBase64, setAttachmentBase64] = useState("");
  const [attachmentMimeType, setAttachmentMimeType] = useState("");
  const [attachmentReading, setAttachmentReading] = useState(false);
  const [length, setLength] = useState(
    () => searchParams.get("length") ?? (isDevelopment ? "400" : ""),
  );
  const [width, setWidth] = useState(
    () => searchParams.get("width") ?? (isDevelopment ? "300" : ""),
  );
  const [height, setHeight] = useState(
    () => searchParams.get("height") ?? (isDevelopment ? "200" : ""),
  );
  const [message, setMessage] = useState(() =>
    isDevelopment ? "Test inquiry from development environment." : "",
  );
  const [quantity, setQuantity] = useState(() => (isDevelopment ? "500" : ""));
  const [acceptedTerms, setAcceptedTerms] = useState(() => isDevelopment);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const boxes = useBusinessStore((state) => state.boxes);
  const boxesError = useBusinessStore((state) => state.boxesError);
  const loadBoxes = useBusinessStore((state) => state.loadBoxes);
  const cardboardTypes = useBusinessStore(
    (state) => state.carboarbonTypeOptions,
  );
  const boxColors = useBusinessStore((state) => state.boxColorOptions);
  const boxPrintOptions = useBusinessStore((state) => state.boxPrintOptions);
  const typeOfSizes = useBusinessStore((state) => state.typeOfSizes);
  const transportOptions = useBusinessStore((state) => state.transportOptions);
  const setBusinessOrderDraft = useBusinessOrderStore(
    (state) => state.setDraft,
  );
  const { notify } = useNotification();
  const { t } = useLanguage();
  const backendBaseUrl = useMemo(() => getBackendBaseUrl(), []);

  useEffect(() => {
    void loadBoxes(backendBaseUrl);
  }, [backendBaseUrl, loadBoxes]);

  const hasAnyError = Object.keys(errors).length > 0;

  const validateAndContinue = () => {
    if (attachmentReading) {
      return;
    }
    if (attachmentName && !attachmentBase64) {
      notify({
        type: "error",
        message: t("business.attachmentStillReading"),
      });
      return;
    }
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
      terms: "section-terms",
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
    else if (!isPositiveNumber(length))
      nextErrors.length = t("business.errors.lengthPositive");
    if (!width.trim()) nextErrors.width = t("business.errors.widthRequired");
    else if (!isPositiveNumber(width))
      nextErrors.width = t("business.errors.widthPositive");
    if (!height.trim()) nextErrors.height = t("business.errors.heightRequired");
    else if (!isPositiveNumber(height))
      nextErrors.height = t("business.errors.heightPositive");

    if (!transportOptions.some((option) => option.isSelected)) {
      nextErrors.transport = t("business.errors.transport");
    }
    if (!quantity.trim())
      nextErrors.quantity = t("business.errors.quantityRequired");
    else if (!isPositiveNumber(quantity))
      nextErrors.quantity = t("business.errors.quantityPositive");
    if (!message.trim())
      nextErrors.message = t("business.errors.messageRequired");
    if (!acceptedTerms) nextErrors.terms = t("business.errors.terms");

    setErrors(nextErrors);

    const firstErrorKey = errorOrder.find((key) => nextErrors[key]);

    if (firstErrorKey) {
      notify({ type: "error", message: nextErrors[firstErrorKey] });
      if (firstErrorKey !== "terms") {
        const sectionId = sectionByError[firstErrorKey];
        const target = document.getElementById(sectionId);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
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
        attachmentBase64,
        attachmentMimeType,
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

      <div className="pt-6 md:pt-8" />
      <ResponsiveLayoutWithPadding>
        <Bar />
        <SectionGap />

        <div id="section-box-type">
          <RedTitle title={t("business.selectBoxType")} />
        </div>
        {errors.boxType ? (
          <p className="mt-3 text-sm text-red-600">{errors.boxType}</p>
        ) : null}
        <TitleGap />
        <div id="section-box-type-cards">
          {boxesError ? (
            <p className="text-sm text-red-600">
              Failed to load box types: {boxesError}
            </p>
          ) : null}
          <GridOfBoxes />
        </div>
        <SectionGap />

        <div id="section-cardboard-type">
          <RedTitle title={t("business.selectCardboardType")} />
        </div>
        {errors.cardboardType ? (
          <p className="mt-3 text-sm text-red-600">{errors.cardboardType}</p>
        ) : null}
        <TitleGap />
        <div id="section-cardboard-type-cards">
          <CarboardType />
        </div>
        <SectionGap />

        <div id="section-cardboard-color">
          <RedTitle title={t("business.selectCardboardColor")} />
        </div>
        {errors.cardboardColor ? (
          <p className="mt-3 text-sm text-red-600">{errors.cardboardColor}</p>
        ) : null}
        <TitleGap />
        <div id="section-cardboard-color-cards">
          <CarboardColors />
        </div>
        <SectionGap />

        <div id="section-box-print">
          <RedTitle title={t("business.boxPrint")} />
        </div>
        {errors.boxPrint ? (
          <p className="mt-3 text-sm text-red-600">{errors.boxPrint}</p>
        ) : null}
        <TitleGap />
        <div id="section-box-print-cards">
          <BoxPrintButtons />
        </div>
        <SectionGap />

        <div id="section-size-type">
          <RedTitle title={t("business.typeOfSizes")} />
        </div>
        {errors.sizeType ? (
          <p className="mt-3 text-sm text-red-600">{errors.sizeType}</p>
        ) : null}
        <TitleGap />
        <div id="section-size-type-cards">
          <TypeOfSizes />
        </div>
        <SectionGap />

        <div id="section-box-size">
          <RedTitle title={t("business.boxSize")} />
        </div>
        <TitleGap />
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-x-8">
          <MyInputField
            text={t("business.lengthMm")}
            id="package-length"
            type={"number"}
            min={1}
            placeholder={t("business.enterLengthMm")}
            value={length}
            onChange={setLength}
            error={errors.length}
          />
          <MyInputField
            text={t("business.widthMm")}
            id="package-width"
            type={"number"}
            min={1}
            placeholder={t("business.enterWidthMm")}
            value={width}
            onChange={setWidth}
            error={errors.width}
          />
          <MyInputField
            text={t("business.heightMm")}
            id="package-height"
            type="number"
            min={1}
            placeholder={t("business.enterHeightMm")}
            value={height}
            onChange={setHeight}
            error={errors.height}
          />
        </div>
        <SectionGap />

        <div id="section-transport">
          <RedTitle title={t("business.transport")} />
        </div>
        {errors.transport ? (
          <p className="mt-3 text-sm text-red-600">{errors.transport}</p>
        ) : null}
        <TitleGap />
        <TransportOptions />

        <SectionGap />

        <div id="section-quantity">
          <RedTitle title={t("business.quantity")} />
        </div>
        <TitleGap />
        <Quantity
          quantity={quantity}
          onQuantityChange={setQuantity}
          quantityError={errors.quantity}
        />
        <SectionGap />

        <RedTitle title={t("business.attachment")} />
        <TitleGap />
        <div className="w-full max-w-md">
          <label
            htmlFor="pdf"
            className="block text-sm font-semibold text-gray-800 mb-2"
          >
            {t("business.uploadFileOptional")}
          </label>
          <div className="flex rounded-xl border-2 border-gray-200 bg-white overflow-hidden focus-within:border-my-yellow focus-within:ring-2 focus-within:ring-my-yellow/30 transition-all">
            <input
              ref={fileInputRef}
              id="pdf"
              type="file"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) {
                  setAttachmentReading(false);
                  setAttachmentName("");
                  setAttachmentBase64("");
                  setAttachmentMimeType("");
                  return;
                }
                if (file.size > MAX_ATTACHMENT_BYTES) {
                  notify({
                    type: "error",
                    message: t("business.maxFileSizePdf"),
                  });
                  setAttachmentReading(false);
                  setAttachmentName("");
                  setAttachmentBase64("");
                  setAttachmentMimeType("");
                  e.currentTarget.value = "";
                  return;
                }
                setAttachmentReading(true);
                setAttachmentBase64("");
                setAttachmentName(file.name);
                setAttachmentMimeType(file.type || "application/octet-stream");
                const reader = new FileReader();
                reader.onload = () => {
                  const result =
                    typeof reader.result === "string" ? reader.result : "";
                  setAttachmentBase64(result);
                  setAttachmentReading(false);
                };
                reader.onerror = () => {
                  notify({
                    type: "error",
                    message: "Failed to read attachment file.",
                  });
                  setAttachmentReading(false);
                  setAttachmentName("");
                  setAttachmentBase64("");
                  setAttachmentMimeType("");
                };
                reader.readAsDataURL(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 px-5 py-3.5 bg-my-yellow hover:bg-my-yellow-bright text-black font-semibold text-sm transition-colors"
            >
              {t("business.chooseFile")}
            </button>
            <span className="flex-1 min-w-0 px-4 py-3.5 text-gray-600 text-sm truncate border-l border-gray-200">
              {attachmentReading
                ? t("business.attachmentReading")
                : attachmentName || t("business.noFileChosen")}
            </span>
          </div>
          <p className="mt-2.5 text-sm text-my-gray">
            {t("business.maxFileSizePdf")}
          </p>
          {attachmentReading ? (
            <p
              data-testid="attachment-reading"
              className="mt-2 text-sm text-gray-600"
            >
              {t("business.attachmentReading")}
            </p>
          ) : null}
        </div>

        <SectionGap />

        <div id="section-message">
          <RedTitle title={t("business.message")} />
        </div>
        <TitleGap />
        <textarea
          className="w-full min-h-48 sm:min-h-60 p-3 rounded-lg border border-gray-300 bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red resize-y"
          placeholder={t("business.enterMessageHere")}
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        {errors.message ? (
          <p className="mt-2 text-sm text-red-600">{errors.message}</p>
        ) : null}
        <SectionGap />

        <div id="section-terms">
          <FieldGroup className="mx-auto">
            <Field orientation="horizontal">
              <Checkbox
                id="terms-checkbox-basic"
                name="terms-checkbox-basic"
                onCheckedChange={(checked) => {
                  setAcceptedTerms(checked === "indeterminate" ? false : checked);
                }}
                checked={acceptedTerms}
              />
              <FieldLabel htmlFor="terms-checkbox-basic">
                {t("business.acceptTerms")}
              </FieldLabel>
            </Field>
          </FieldGroup>
          {errors.terms ? (
            <p className="mt-2 text-sm text-red-600">{errors.terms}</p>
          ) : null}
        </div>
        <SectionGap />

        <div className="flex justify-start">
          <button
            type="button"
            onClick={validateAndContinue}
            disabled={attachmentReading}
            aria-busy={attachmentReading}
            className="inline-flex items-center gap-2 bg-my-yellow hover:bg-my-yellow-bright text-black font-bold uppercase text-sm sm:text-base px-6 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-my-red focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("common.next")}
            <span aria-hidden>→</span>
          </button>
        </div>
        <SectionGap />
      </ResponsiveLayoutWithPadding>

      <B2bProfessionalsSection />

      <ServicesSection />
      <HaveAQuestion />
      <NewsletterSubscribe />
    </div>
  );

  function SectionGap() {
    return <div className="pt-5 md:pt-6" />;
  }

  function TitleGap() {
    return <div className="pt-4 md:pt-5" />;
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

export default function BusinessPage() {
  return (
    <Suspense fallback={null}>
      <BussinessPage />
    </Suspense>
  );
}
