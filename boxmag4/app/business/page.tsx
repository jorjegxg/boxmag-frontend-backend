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
import { useRouter } from "next/navigation";
import useBusinessStore from "./store/business_store";
import useBusinessOrderStore from "../stores/business_order_store";

const BussinessPage = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentName, setAttachmentName] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [message, setMessage] = useState("");
  const [quantity, setQuantity] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState("");

  const boxes = useBusinessStore((state) => state.boxes);
  const cardboardTypes = useBusinessStore((state) => state.carboarbonTypeOptions);
  const boxColors = useBusinessStore((state) => state.boxColorOptions);
  const boxPrintOptions = useBusinessStore((state) => state.boxPrintOptions);
  const typeOfSizes = useBusinessStore((state) => state.typeOfSizes);
  const transportOptions = useBusinessStore((state) => state.transportOptions);
  const setBusinessOrderDraft = useBusinessOrderStore((state) => state.setDraft);

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
      boxType: "section-box-type",
      cardboardType: "section-cardboard-type",
      cardboardColor: "section-cardboard-color",
      boxPrint: "section-box-print",
      sizeType: "section-size-type",
      length: "section-box-size",
      width: "section-box-size",
      height: "section-box-size",
      transport: "section-transport",
      quantity: "section-quantity",
      terms: "section-quantity",
      message: "section-message",
    };

    if (!boxes.some((box) => box.isSelected)) {
      nextErrors.boxType = "Please select a box type.";
    }
    if (!cardboardTypes.some((option) => option.isSelected)) {
      nextErrors.cardboardType = "Please select a cardboard type.";
    }
    if (!boxColors.some((option) => option.isSelected)) {
      nextErrors.cardboardColor = "Please select a cardboard colour.";
    }
    if (!boxPrintOptions.some((option) => option.isSelected)) {
      nextErrors.boxPrint = "Please choose a box print option.";
    }
    if (!typeOfSizes.some((option) => option.isSelected)) {
      nextErrors.sizeType = "Please choose a size type.";
    }

    if (!length.trim()) nextErrors.length = "Length is required.";
    if (!width.trim()) nextErrors.width = "Width is required.";
    if (!height.trim()) nextErrors.height = "Height is required.";

    if (!transportOptions.some((option) => option.isSelected)) {
      nextErrors.transport = "Please select a transport option.";
    }
    if (!quantity.trim()) nextErrors.quantity = "Quantity is required.";
    if (!message.trim()) nextErrors.message = "Message is required.";
    if (!acceptedTerms) nextErrors.terms = "You must accept terms and conditions.";

    setErrors(nextErrors);

    const firstErrorKey = errorOrder.find((key) => nextErrors[key]);

    if (firstErrorKey) {
      setNotification(nextErrors[firstErrorKey]);
      const sectionId = sectionByError[firstErrorKey];
      const target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setNotification("");
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
            Home
          </Link>{" "}
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">B2B</span>
        </div>
      </section>

      <div className="pt-8 md:pt-12 lg:pt-16" />
      <ResponsiveLayoutWithPadding>
        {hasAnyError ? (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700"
          >
            {notification || "Please complete all required fields before continuing."}
          </div>
        ) : null}
        <Bar />
        <Pt16 />

        <div id="section-box-type">
          <RedTitle
            title="Select Box Type"
            secondTitle="More Details"
            link="/shop"
          />
        </div>
        <Pt16 />
        <GridOfBoxes />
        {errors.boxType ? <p className="mt-3 text-sm text-red-600">{errors.boxType}</p> : null}
        <Pt16 />

        <div id="section-cardboard-type">
          <RedTitle title="Select Cardboard Type" />
        </div>
        <Pt16 />
        <CarboardType />
        {errors.cardboardType ? <p className="mt-3 text-sm text-red-600">{errors.cardboardType}</p> : null}
        <Pt16 />

        <div id="section-cardboard-color">
          <RedTitle title="Select Cardboard Colour" />
        </div>
        <Pt16 />
        <CarboardColors />
        {errors.cardboardColor ? <p className="mt-3 text-sm text-red-600">{errors.cardboardColor}</p> : null}
        <Pt16 />

        <div id="section-box-print">
          <RedTitle title="Box Print" />
        </div>
        <Pt16 />
        <BoxPrintButtons />
        {errors.boxPrint ? <p className="mt-3 text-sm text-red-600">{errors.boxPrint}</p> : null}
        <Pt16 />

        <div id="section-size-type">
          <RedTitle title="Type Of Sizes" />
        </div>
        <Pt16 />
        <TypeOfSizes />
        {errors.sizeType ? <p className="mt-3 text-sm text-red-600">{errors.sizeType}</p> : null}
        <Pt16 />

        <div id="section-box-size">
          <RedTitle title="Box Size" />
        </div>
        <Pt16 />
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-x-8">
          <MyInputField
            text={"Length (mm)"}
            id="package-length"
            type={"number"}
            placeholder={"Enter Package Length (mm)"}
            value={length}
            onChange={setLength}
            error={errors.length}
          />
          <MyInputField
            text={"Width (mm)"}
            id="package-width"
            type={"number"}
            placeholder={"Enter Package Width (mm)"}
            value={width}
            onChange={setWidth}
            error={errors.width}
          />
          <MyInputField
            text={"Height (mm)"}
            id="package-height"
            type="number"
            placeholder={"Enter Package Height (mm)"}
            value={height}
            onChange={setHeight}
            error={errors.height}
          />
        </div>
        <Pt16 />

        <div id="section-transport">
          <RedTitle title="Transport" />
        </div>
        <Pt16 />
        <TransportOptions />
        {errors.transport ? <p className="mt-3 text-sm text-red-600">{errors.transport}</p> : null}

        <Pt16 />

        <div id="section-quantity">
          <RedTitle title="Quantity" />
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

        <RedTitle title="Attachment" />
        <Pt16 />
        <div className="w-full max-w-md">
          <label htmlFor="pdf" className="block text-sm font-semibold text-gray-800 mb-2">
            Upload a file (optional)
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
              Choose File
            </button>
            <span className="flex-1 min-w-0 px-4 py-3.5 text-gray-600 text-sm truncate border-l border-gray-200">
              {attachmentName || "No file chosen"}
            </span>
          </div>
          <p className="mt-2.5 text-sm text-my-gray">
            Max file size: 18 MB. Allowed format: PDF
          </p>
        </div>

        <Pt16 />

        <div id="section-message">
          <RedTitle title="Message" />
        </div>
        <Pt16 />
        <textarea
          className="w-full min-h-48 sm:min-h-60 p-3 rounded-lg border border-gray-300 bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red resize-y"
          placeholder="Enter your message here..."
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
            Next
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
                B2B <span className="font-bold">Professionals</span>
              </h2>
              <p className="text-white/95 text-xs lg:text-sm mt-0.5">
                Step By Step To The Best Offer
              </p>
            </div>
          </div>
          <div className="lg:border-l lg:border-white/20 lg:pl-8 flex flex-col items-center lg:items-start text-center lg:text-left">
            <p className="text-my-yellow font-semibold text-sm lg:text-base mb-2">
              Do you need more informations?
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
