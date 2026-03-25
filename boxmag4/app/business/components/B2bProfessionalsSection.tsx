"use client";

import Image from "next/image";
import { FaEnvelope, FaPhoneAlt, FaClock } from "react-icons/fa";

export function B2bProfessionalsSection() {
  return (
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
  );
}

export default B2bProfessionalsSection;
