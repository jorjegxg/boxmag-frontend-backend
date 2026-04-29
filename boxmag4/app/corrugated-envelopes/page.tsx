"use client";

import { Shop2ProductsTable } from "../components/Shop2ProductsTable";
import { B2b } from "../global/components/b2b";
import { HaveAQuestion } from "../global/components/have-a-question";
import { NewsletterSubscribe } from "../global/components/newsletter-subscribe";
import Link from "next/link";
import Image from "next/image";
import { ServicesSection } from "../global/components/services-section";
import { useLanguage } from "../i18n/language-context";
import { FaCheck } from "react-icons/fa";

export default function CorrugatedEnvelopesPage() {
  const { t } = useLanguage();

  return (
    <div>
      <B2b />

      {/* Current page section */}
      <section className="w-full bg-white px-6 lg:px-20 pt-6">
        <div className="max-w-7xl mx-auto text-xs lg:text-sm text-gray-500 uppercase tracking-wide">
          <Link href="/" className="hover:underline">
            {t("common.home")}
          </Link>{" "}
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">
            {t("footer.shop")}
          </span>{" "}
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">
            {t("home.corrugated.title")}
          </span>
        </div>
      </section>

      {/* Packaging for e-commerce section (no dots) */}
      <section className="w-full bg-white px-6 lg:px-20 pt-6">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-[28px] border border-black/20 bg-[#f2f2f2] px-6 py-10 lg:px-12 lg:py-12">
            <h2 className="text-center text-3xl lg:text-6xl font-extrabold text-black uppercase tracking-wide">
              {t("home.corrugated.title")}
            </h2>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-12 items-end">
              {[
                {
                  src: "/b2b/boxes/envelope.png",
                  alt: "Corrugated cardboard envelope left",
                },
                {
                  src: "/b2b/boxes/envelope.png",
                  alt: "Corrugated cardboard envelope center",
                },
                {
                  src: "/b2b/boxes/envelope.png",
                  alt: "Corrugated cardboard envelope right",
                },
              ].map(({ src, alt }, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-center ${
                    i === 0 ? "self-center" : ""
                  }`}
                >
                  <div
                    className={`w-full max-w-[250px] flex items-center justify-center overflow-hidden ${
                      i === 0
                        ? "h-[95px] lg:h-[120px]"
                        : "h-[180px] lg:h-[210px]"
                    }`}
                  >
                    <Image
                      src={src}
                      alt={alt}
                      width={350}
                      height={260}
                      className={`w-full h-full ${
                        i === 0
                          ? "object-cover object-bottom"
                          : i === 2
                            ? "object-cover object-right rotate-90"
                            : "object-contain"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center max-w-5xl mx-auto text-black">
              <p className="leading-relaxed text-lg">
                Crafted from high-quality E-flute corrugated cardboard our
                "M-EV" range envelopes guarantee a high level of bend protection
                for your items throughout the shipping process.
              </p>
              <p className="mt-5 leading-relaxed text-lg">
                Engineered with box-form capacity these envelopes offer an
                unmatched durability compared to conventional postal options.
              </p>
              <p className="mt-5 leading-relaxed text-lg">
                Designed for efficiency our envelopes simplify the packaging
                process and save you valuable time.
              </p>
              <p className="mt-5 leading-relaxed text-lg">
                Is available in various sizes and can be used universally both
                as an envelope and a box. They are made from 100% biodegradable
                and fully recyclable materials. Corrugated cardboard is a
                particularly circular product.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Discover section */}
      <section className="w-full bg-[#f36a45] mt-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-20 py-6">
          <p className="text-center text-white font-bold uppercase leading-tight text-lg lg:text-2xl">
            DISCOVER OUR VARIOUS CORRUGATED CARDBOARD ENVELOPES SIZES.
            <br />
            ORDER NOW AND PACK ON TIME.
          </p>
        </div>
      </section>

      {/* BoxFix Products section */}
      <section className="w-full px-4 py-10 sm:px-6 lg:px-20 bg-[#f2f2f2]">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl lg:text-4xl font-extrabold text-[#16c8c2] uppercase leading-tight mb-8">
            EXCELLENT AND FLEXIBLE SOLUTIONS FOR E-COMMERCE
            <br />
            BUSSINES TO SEND PRODUCTS WITH POST VIA COURIER.
          </h1>
          <div className="-mx-4 sm:mx-0 min-w-0">
            <Shop2ProductsTable />
            <p className="mt-5 text-sm text-gray-500">
              Showing 1-5 of 5 item(s)
            </p>
          </div>
        </div>{" "}
      </section>
      <div className="pt-16"></div>
      <section className="bg-my-light-gray2 py-16 px-6 lg:px-20 w-full">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-my-red text-3xl lg:text-5xl font-extrabold uppercase leading-tight mb-8">
              WHY CHOOSE CORRUGATED
              <br />
              CARDBOARD ENVELOPES?
            </h2>

            <ul className="space-y-3 text-black text-xl">
              {[
                "Designed with variable filling, height up to 75 mm",
                "Easy to close, thanks to glue tape",
                "Easy to opened, thanks to tear strip",
                "Strong E-flute corrugated cardboard secure shipping",
                "Easy handling, secure shipping",
                "Material: FSC certified, plastic FREE",
                "Material: 100% biodegradable, complete recyclable.",
                "E-flute or F-flute corrugated cardboard: 300-325 gr/sqm",
                "Length+ width+depth are all adjustable",
                "Also known in the market as M-envelopes folders, those packaging solution is widely used by Amazon and other online markets.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 leading-snug">
                  <span className="mt-1 text-[#10cfc3]">
                    <FaCheck className="w-5 h-5" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="bg-[#f0ab3c] rounded-[28px] p-8 w-full max-w-lg min-h-[320px] flex items-center justify-center">
              <Image
                src="/b2b/boxes/envelope.png"
                alt="Corrugated cardboard envelope"
                width={360}
                height={420}
                className="w-full max-w-[360px] h-auto object-contain"
              />
            </div>
          </div>
        </div>
      </section>
      <HaveAQuestion />
      <ServicesSection />
      <NewsletterSubscribe />
    </div>
  );
}
