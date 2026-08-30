"use client";

import { useEffect, useState } from "react";
import { FaStar, FaQuoteLeft, FaQuoteRight } from "react-icons/fa";
import { useLanguage } from "../i18n/language-context";

export default function TestimonialSection() {
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
  }, [TESTIMONIALS.length]);

  const review = TESTIMONIALS[currentIndex];

  return (
    <section className="bg-teal-500 py-16 w-full">
      <div className="grid lg:grid-cols-2 gap-12 items-center pl-6 lg:pl-20 pr-0">
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
