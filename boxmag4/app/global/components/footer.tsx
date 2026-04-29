"use client";

import Image from "next/image";
import Link from "next/link";
import { FaMapMarkerAlt, FaPhoneAlt, FaFax, FaEnvelope } from "react-icons/fa";
import { FaFacebookF, FaInstagram } from "react-icons/fa6";
import { useLanguage } from "../../i18n/language-context";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="w-full bg-[#f36a45] text-white ">
      <div className="mx-auto px-6 lg:px-20 pt-10 pb-6 relative overflow-hidden">
        {/* Lion illustration on the left */}
        <div className="absolute inset-y-0 left-0 w-40 lg:w-56 opacity-80 pointer-events-none select-none">
          <Image
            src="/svgs/footer_lion.svg"
            alt="Lion illustration"
            fill
            className="object-cover"
          />
        </div>

        {/* Columns */}
        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-10 lg:gap-16">
          {/* Store information */}
          <div className="space-y-3 text-sm lg:text-base">
            <h3 className="font-bold tracking-wide uppercase">
              {t("footer.storeInformation")}
            </h3>
            <div className="flex items-start gap-2">
              <FaMapMarkerAlt className="mt-0.5" />
              <span>
                Stefan cel Mare 131 Street,
                <br />
                RO-725400 - Radauti, Suceava
              </span>
            </div>
            <Link
              href="tel:+40799553345"
              className="flex items-center gap-2 hover:underline"
            >
              <FaPhoneAlt />
              <span>+40 799 553 345</span>
            </Link>
            <Link
              href="tel:+40230565997"
              className="flex items-center gap-2 hover:underline"
            >
              <FaFax />
              <span>+40 230 565 997</span>
            </Link>
            <Link
              href="mailto:info@boxmag.eu"
              className="flex items-center gap-2 hover:underline"
            >
              <FaEnvelope />
              <span>info@boxmag.eu</span>
            </Link>
          </div>

          {/* Our company */}
          <div className="space-y-2 text-sm lg:text-base">
            <h3 className="font-bold tracking-wide uppercase">{t("footer.ourCompany")}</h3>
            <ul className="space-y-1">
              <li>
                <Link href="/" className="hover:underline">
                  {t("footer.home")}
                </Link>
              </li>
              <li>
                <Link href="/boxesfetxo" className="hover:underline">
                  {t("footer.shop")}
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:underline">
                  {t("footer.aboutUs")}
                </Link>
              </li>
              <li>
                <Link href="/regulations" className="hover:underline">
                  {t("footer.regulations")}
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:underline">
                  {t("footer.privacyPolicy")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer service */}
          <div className="space-y-2 text-sm lg:text-base">
            <h3 className="font-bold tracking-wide uppercase">
              {t("footer.customerService")}
            </h3>
            <ul className="space-y-1">
              <li>
                <Link href="/how-to-buy" className="hover:underline">
                  {t("footer.howToBuy")}
                </Link>
              </li>
              <li>
                <Link href="/delivery" className="hover:underline">
                  {t("footer.deliveryOfGoods")}
                </Link>
              </li>
              <li>
                <Link
                  href="/complaints-and-returns"
                  className="hover:underline"
                >
                  {t("footer.complaintsReturns")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:underline">
                  {t("footer.contactUs")}
                </Link>
              </li>
            </ul>
            <div className="flex gap-3 pt-3">
              <a href="#" aria-label="Facebook" className="hover:opacity-80">
                <FaFacebookF />
              </a>
              <a href="#" aria-label="Instagram" className="hover:opacity-80">
                <FaInstagram />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="w-full bg-[#cf5330] py-3 text-center text-xs lg:text-sm text-white">
        {t("footer.copyright")}© {new Date().getFullYear()} BOXMAG
      </div>
    </footer>
  );
}
