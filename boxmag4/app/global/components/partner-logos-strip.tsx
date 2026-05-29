"use client";

import Image from "next/image";

const PARTNER_LOGOS = [
  {
    src: "/logos/DPD_logo_redgrad_rgb.png",
    alt: "DPD",
    width: 120,
    height: 48,
    className: "h-8 md:h-10 w-auto",
  },
  {
    src: "/logos/idO6xMl5EH_logos.jpeg",
    alt: "Magazin de încredere — Trusted.ro",
    width: 64,
    height: 64,
    className: "h-10 md:h-12 w-auto",
  },
  {
    src: "/logos/Stripe wordmark - Blurple - Small.png",
    alt: "Stripe",
    width: 120,
    height: 32,
    className: "h-7 md:h-8 w-auto",
  },
] as const;

export function PartnerLogosStrip() {
  return (
    <section
      className="w-full border-y border-black/5 bg-white py-6 md:py-8"
      aria-label="Parteneri"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-20">
        <ul className="flex flex-wrap items-center justify-center gap-10 md:gap-16 lg:gap-20">
          {PARTNER_LOGOS.map((logo) => (
            <li key={logo.src} className="flex items-center justify-center shrink-0">
              <Image
                src={logo.src}
                alt={logo.alt}
                width={logo.width}
                height={logo.height}
                className={`object-contain ${logo.className}`}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
