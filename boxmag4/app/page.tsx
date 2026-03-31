"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import useTableEComStore from "./stores/table_e_commerce_store";
import { Product } from "./types/product";
import { FaStar, FaQuoteLeft, FaQuoteRight } from "react-icons/fa";
import { ProductsTable } from "./components/ProductTable";
import MyOutlinedButton from "./business/components/MyOutlinedButton";
import { MouseEvent } from "react";
import { B2b } from "./global/components/b2b";
import { HaveAQuestion } from "./global/components/have-a-question";
import { NewsletterSubscribe } from "./global/components/newsletter-subscribe";
import { WhyChooseBoxfixSection } from "./global/components/why-choose-boxfix-section";
import { ServicesSection } from "./global/components/services-section";
import { FeaturesSection } from "./global/components/features-section";
import { useLanguage } from "./i18n/language-context";

export default function Home() {
  const router = useRouter();
  return (
    <div>
      <B2b />
      <HeroSizeSection />
      <ProducersBanner />
      <BoxfixSection onSeeNow={() => router.push("/shop")} />
      <CorrugatedEnvelopesSection onSeeNow={() => router.push("/shop-2")} />
      <WhyChooseBoxfixSection />
      <TestimonialSection />
      <FeaturesSection />
      <ServicesSection />
      <HaveAQuestion />
      <NewsletterSubscribe />
    </div>
  );
}

function HeroSizeSection() {
  const { t } = useLanguage();
  const labels = [t("home.hero.length"), t("home.hero.width"), t("home.hero.height")];
  const sizeOptions = ["200", "300", "400", "500", "600", "700", "800", "900", "1000"];
  const [selectedLength, setSelectedLength] = useState("400");
  const [selectedWidth, setSelectedWidth] = useState("400");
  const [selectedHeight, setSelectedHeight] = useState("400");

  return (
    <section className="w-full bg-white py-10 px-6 lg:px-20">
      <div className="max-w-7xl mx-auto">
        <div className="bg-my-yellow rounded-3xl px-8 py-10 lg:px-12 lg:py-12 flex flex-col lg:flex-row items-stretch gap-10">
          {/* Left: headline + selectors + CTA */}
          <div className="flex-1 flex flex-col justify-between gap-8">
            <h1 className="text-3xl lg:text-5xl font-extrabold text-black leading-tight uppercase">
              {t("home.hero.title1")}
              <br />
              {t("home.hero.title2")}
              <br />
              {t("home.hero.title3")}
            </h1>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {labels.map((label, idx) => (
                  <div key={label} className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-black">
                      {label}
                    </span>
                    <select
                      value={idx === 0 ? selectedLength : idx === 1 ? selectedWidth : selectedHeight}
                      onChange={(e) => {
                        if (idx === 0) setSelectedLength(e.target.value);
                        else if (idx === 1) setSelectedWidth(e.target.value);
                        else setSelectedHeight(e.target.value);
                      }}
                      className="h-11 rounded-md border border-black/20 bg-white px-3 text-sm font-medium text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-my-blue focus:border-my-blue"
                    >
                      {sizeOptions.map((size) => (
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
          </div>

          {/* Right: box image */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-md">
              <Image
                src="/b2b/boxes/ecommerce.png"
                alt="Open e-commerce shipping box"
                width={600}
                height={400}
                className="w-full h-auto object-contain rounded-3xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialSection() {
  const { t } = useLanguage();
  const TESTIMONIALS = [
    { text: t("home.testimonial.1"), name: "Jhon H." },
    { text: t("home.testimonial.2"), name: "Maria K." },
    { text: t("home.testimonial.3"), name: "David L." },
  ];
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % TESTIMONIALS.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const review = TESTIMONIALS[currentIndex];

  return (
    <section className="bg-teal-500 py-16 w-full">
      <div className="grid lg:grid-cols-2 gap-12 items-center pl-6 lg:pl-20 pr-0">
        {/* LEFT: Quote, stars, review text, name, dots */}
        <div className="relative text-white">
          <FaQuoteLeft className="absolute -top-2 left-0 w-12 h-12 lg:w-16 lg:h-16 text-teal-600 opacity-90" />
          <div className="px-10 pt-6 lg:px-14 lg:pt-8 min-h-[200px] flex flex-col items-center">
            <div className="flex gap-1 mb-4 justify-center">
              {[1, 2, 3, 4, 5].map((i) => (
                <FaStar key={i} className="w-6 h-6 text-orange-400" />
              ))}
            </div>
            <div
              key={currentIndex}
              style={{ animation: "fadeIn 0.5s ease-out" }}
            >
              <p className="text-xl lg:text-2xl mb-4">{review.text}</p>
              <p className="font-semibold">{review.name}</p>
            </div>
            <div className="flex justify-center lg:justify-start gap-2 mt-8">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className="rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white/50"
                  aria-label={`${t("home.testimonial.aria")} ${i + 1}`}
                >
                  <span
                    className={`block rounded-full transition-all ${
                      i === currentIndex
                        ? "w-3 h-3 bg-white"
                        : "w-2 h-2 bg-white/60"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          <FaQuoteRight className="absolute bottom-0 right-0 w-12 h-12 lg:w-16 lg:h-16 text-teal-600 opacity-90" />
        </div>

        {/* RIGHT: Hands holding box image */}
        <div className="flex justify-end">
          <img
            src="/b2b/boxes/hand-holdign-box.png"
            alt="Customer holding REKO Packaging box"
            className="w-full max-w-md object-contain"
          />
        </div>
      </div>
    </section>
  );
}

function CorrugatedEnvelopesSection({
  onSeeNow,
}: {
  onSeeNow: () => void;
}) {
  const { t } = useLanguage();

  return (
    <section className="bg-white w-full py-16 px-6 lg:px-20">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        {/* Left: product image in yellow card */}
        <div className="relative flex justify-center lg:justify-start">
          <div className="bg-my-yellow rounded-3xl p-8 lg:p-10 w-full max-w-md aspect-4/5 flex items-center justify-center overflow-hidden">
            <Image
              src="/b2b/boxes/envelope.png"
              alt="Corrugated cardboard envelopes with box form capabilities"
              width={400}
              height={500}
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Right: copy and CTA */}
        <div className="flex flex-col items-start">
          <p className="text-my-red text-xl lg:text-2xl font-semibold mb-3 uppercase tracking-wide">
            {t("home.weOffer")}
          </p>
          <h2 className="text-3xl lg:text-5xl font-bold text-black mb-4 leading-tight uppercase">
            {t("home.corrugated.title")}
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            {t("home.corrugated.subtitle")}
          </p>
          <MyOutlinedButton
            isSelected={false}
            onClick={onSeeNow}
            textOnTheButton={t("home.seeNow")}
            showArrow={true}
            reverseColors={true}
          />
        </div>
      </div>
    </section>
  );
}

function BoxfixSection({
  onSeeNow,
}: {
  onSeeNow: () => void;
}) {
  const { t } = useLanguage();

  return (
    <section className="bg-my-light-gray2 py-16 px-6 lg:px-20 w-full">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        {/* LEFT CONTENT */}
        <div>
          <p className="text-my-red text-2xl font-semibold  mb-4">{t("home.weOffer")}</p>

          <h1 className="text-5xl lg:text-6xl font-bold text-black mb-6">
            Box
            <span className="relative z-10">fix</span>
            <sup className="text-lg align-top">®</sup>
          </h1>

          <p className="text-lg mb-4">
            <span className="font-semibold">{t("home.boxfix.stopSendingAir")}</span> -{" "}
            {t("home.boxfix.costsLine")}
          </p>

          <p className="text-xl mb-8">{t("home.boxfix.offerLine")}</p>

          {/* <button className="bg-my-yellow hover:bg-my-red transition px-8 py-4 rounded-lg font-semibold flex items-center gap-3 shadow-md">
            SEE NOW
            <span className="text-xl">→</span>
          </button> */}
          <MyOutlinedButton
            isSelected={false}
            onClick={onSeeNow}
            textOnTheButton={t("home.seeNow")}
            showArrow={true}
            reverseColors={true}
          />
        </div>

        {/* RIGHT IMAGE */}
        <div className="flex justify-center lg:justify-end">
          <div className="bg-my-yellow rounded-3xl p-10 w-full max-w-md ">
            <img
              src="/placeholders/box4.png" // replace with your image path
              alt="Boxfix packaging"
              className="w-full object-contain h-100"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProducersBanner() {
  const { t } = useLanguage();

  return (
    <div className="flex justify-center items-center bg-my-red py-4 w-full">
      <div className="max-w-7xl mx-auto flex items-center gap-4 w-full px-4">
        <div className="flex-1 min-w-0 pr-4 text-white text-xl font-semibold">
          {t("home.producersBanner")}
        </div>
        <div className="shrink-0 w-28 md:w-36">
          <Image
            src="/svgs/logo/logo_with_registered_mark_white.svg"
            alt="b2b"
            width={500}
            height={500}
            className="w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
}
