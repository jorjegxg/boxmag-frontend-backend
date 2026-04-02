"use client";

import { B2b } from "../global/components/b2b";
import Link from "next/link";
import { ServicesSection } from "../global/components/services-section";
import { HaveAQuestion } from "../global/components/have-a-question";
import { NewsletterSubscribe } from "../global/components/newsletter-subscribe";
import { useState, useRef } from "react";
import Image from "next/image";
import {
  FaCommentAlt,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
} from "react-icons/fa";
import { checkVAT, countries } from "jsvat";
import { useLanguage } from "../i18n/language-context";
import { useNotification } from "../global/components/notification-center";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red";
const MAX_ATTACHMENT_MB = 10;
const MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_MB * 1024 * 1024;
const MAX_ATTACHMENTS = 5;
const shouldAutofillContactForm =
  process.env.NEXT_PUBLIC_CONTACT_FORM_MODE?.toLowerCase() === "dev";

export default function ContactUsPage() {
  const { t } = useLanguage();
  const { notify } = useNotification();
  const [firstName, setFirstName] = useState(shouldAutofillContactForm ? "John" : "");
  const [surname, setSurname] = useState(shouldAutofillContactForm ? "Doe" : "");
  const [companyName, setCompanyName] = useState(
    shouldAutofillContactForm ? "Boxmag Test SRL" : "",
  );
  const [vatNumber, setVatNumber] = useState(
    shouldAutofillContactForm ? "RO12345678" : "",
  );
  const [email, setEmail] = useState(
    shouldAutofillContactForm ? "yotrevorgxg@gmail.com" : "",
  );
  const [phone, setPhone] = useState(
    shouldAutofillContactForm ? "+40799111222" : "",
  );
  const [country, setCountry] = useState(shouldAutofillContactForm ? "RO" : "");
  const [message, setMessage] = useState(
    shouldAutofillContactForm
      ? "Hello! This is a test message generated in dev mode."
      : "",
  );
  const [acceptTerms, setAcceptTerms] = useState(shouldAutofillContactForm);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const missingFields: string[] = [];
    let firstMissingFieldId: string | null = null;

    const registerMissingField = (fieldId: string, fieldLabel: string) => {
      missingFields.push(fieldLabel);
      if (!firstMissingFieldId) firstMissingFieldId = fieldId;
    };

    if (!firstName.trim()) registerMissingField("firstName", t("contact.firstName"));
    if (!surname.trim()) registerMissingField("surname", t("contact.surname"));
    if (!email.trim()) registerMissingField("email", t("contact.email"));
    if (!phone.trim()) registerMissingField("phone", t("contact.phone"));
    if (!country.trim()) registerMissingField("country", t("contact.country"));
    if (!message.trim()) registerMissingField("message", t("contact.message"));

    if (missingFields.length > 0) {
      notify({
        type: "error",
        message: `Please complete the following fields: ${missingFields.join(", ")}.`,
      });
      if (firstMissingFieldId) {
        document.getElementById(firstMissingFieldId)?.focus();
      }
      return;
    }

    if (!acceptTerms) {
      notify({ type: "error", message: "Please accept terms and privacy policy." });
      return;
    }

    const vatCheck = vatNumber.trim()
      ? checkVAT(vatNumber.trim().toUpperCase(), countries)
      : null;
    if (vatCheck && !vatCheck.isValid && !vatCheck.isValidFormat) {
      notify({
        type: "error",
        message:
          "Invalid VAT number. Please provide a valid VAT for the selected country (e.g. RO12345678).",
      });
      return;
    }

    if (attachments.length > MAX_ATTACHMENTS) {
      notify({
        type: "error",
        message: `You can upload up to ${MAX_ATTACHMENTS} files.`,
      });
      return;
    }

    const oversizedFile = attachments.find((file) => file.size > MAX_ATTACHMENT_BYTES);
    if (oversizedFile) {
      notify({
        type: "error",
        message: `File "${oversizedFile.name}" is too large. Maximum allowed size is ${MAX_ATTACHMENT_MB} MB per file.`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("firstName", firstName);
      formData.append("surname", surname);
      formData.append("companyName", companyName);
      formData.append("vatNumber", vatNumber);
      formData.append("email", email);
      formData.append("phone", phone);
      formData.append("country", country);
      formData.append("message", message);
      formData.append("acceptTerms", String(acceptTerms));
      attachments.forEach((file) => formData.append("attachment", file));

      const response = await fetch("/api/contact", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        notify({ type: "error", message: data.message ?? "Unable to send your message." });
        return;
      }

      notify({ type: "success", message: data.message ?? "Message sent successfully." });
      setFirstName("");
      setSurname("");
      setCompanyName("");
      setVatNumber("");
      setEmail("");
      setPhone("");
      setCountry("");
      setMessage("");
      setAcceptTerms(false);
      setAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      notify({ type: "error", message: "Unable to send your message right now." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <B2b />

      {/* Path section */}
      <section className="w-full bg-white px-6 lg:px-20 py-6">
        <div className="max-w-7xl mx-auto text-xs lg:text-sm text-gray-500 uppercase tracking-wide">
          <Link href="/" className="hover:underline">
            {t("common.home")}
          </Link>{" "}
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">{t("contact.contactUs")}</span>
        </div>
      </section>

      {/* SendAMessageSection */}
      <section className="w-full bg-my-red py-4 px-6 lg:px-20">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
          <FaCommentAlt className="w-8 h-8 lg:w-10 lg:h-10 text-white shrink-0" />
          <h2 className="text-white text-xl lg:text-2xl font-bold uppercase tracking-wide">
            {t("contact.sendMessage")}
          </h2>
        </div>
      </section>

      {/* FormSection */}
      <section className="w-full bg-white px-6 lg:px-20 py-10">
        <div className="max-w-4xl mx-auto rounded-[28px] border border-black/15 bg-white px-6 py-8 lg:px-10 lg:py-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-semibold text-gray-800 mb-1"
                >
                  {t("contact.firstName")}
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t("contact.firstName")}
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="surname"
                  className="block text-sm font-semibold text-gray-800 mb-1"
                >
                  {t("contact.surname")}
                </label>
                <input
                  id="surname"
                  type="text"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  placeholder={t("contact.surname")}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="companyName"
                  className="block text-sm font-semibold text-gray-800 mb-1"
                >
                  {t("contact.companyName")}
                </label>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={t("contact.companyName")}
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="vatNumber"
                  className="block text-sm font-semibold text-gray-800 mb-1"
                >
                  {t("contact.vatNumber")}
                </label>
                <input
                  id="vatNumber"
                  type="text"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  placeholder={t("contact.vatNumber")}
                  pattern="[A-Za-z]{2}[A-Za-z0-9]{2,12}"
                  title="Use country code plus 2-12 letters/digits (e.g. RO12345678)"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-gray-800 mb-1"
                >
                  {t("contact.email")}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourwebsite.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-semibold text-gray-800 mb-1"
                >
                  {t("contact.phone")}
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("contact.phone")}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="country"
                className="block text-sm font-semibold text-gray-800 mb-1"
              >
                {t("contact.country")}
              </label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={inputClass}
              >
                <option value="">{t("contact.country")}</option>
                <option value="RO">Romania</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="IT">Italy</option>
                <option value="ES">Spain</option>
                <option value="NL">Netherlands</option>
                <option value="BE">Belgium</option>
                <option value="PL">Poland</option>
                <option value="AT">Austria</option>
                <option value="HU">Hungary</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                {t("contact.attachment")}
              </label>
              <div className="flex gap-2 items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => setAttachments(Array.from(e.target.files ?? []))}
                />
                <span className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-500 text-sm truncate">
                  {attachments.length === 0
                    ? t("contact.noFile")
                    : attachments.length === 1
                      ? attachments[0].name
                      : `${attachments.length} files selected`}
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 px-4 py-3 rounded-lg bg-my-yellow hover:bg-my-yellow-bright text-black font-semibold transition-colors"
                >
                  {t("contact.chooseFile")}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Max file size: {MAX_ATTACHMENT_MB} MB per file (up to {MAX_ATTACHMENTS} files)
              </p>
            </div>
            <div>
              <label
                htmlFor="message"
                className="block text-sm font-semibold text-gray-800 mb-1"
              >
                {t("contact.message")}
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("contact.typeMessage")}
                rows={5}
                className={`${inputClass} resize-y min-h-[120px]`}
              />
            </div>
            <label className="flex gap-3 items-start cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-2 border-gray-300 bg-white accent-my-red focus:ring-my-red"
              />
              <span className="text-sm text-gray-700">
                {t("contact.termsPrefix")}
                <Link
                  href="/terms"
                  className="text-my-red font-medium underline hover:no-underline"
                >
                  {t("contact.terms")}
                </Link>{" "}
                {t("contact.and")}
                <Link
                  href="/privacy"
                  className="text-my-red font-medium underline hover:no-underline"
                >
                  {t("contact.privacy")}
                </Link>
                .
              </span>
            </label>
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-my-yellow hover:bg-my-yellow-bright text-black font-bold uppercase tracking-wide transition-colors"
              >
                {isSubmitting ? "Sending..." : t("contact.send")}
                <span className="text-lg">→</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Store information – teal section with location.svg */}
      <section className="w-full bg-teal-600 py-12 px-6 lg:px-20">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-stretch gap-10 lg:gap-12">
          <div className="flex-1">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 uppercase tracking-wide mb-6">
              {t("contact.storeInfo")}
            </h2>
            <div className="space-y-4 text-gray-700">
              <div className="flex items-start gap-3">
                <FaMapMarkerAlt className="w-5 h-5 text-gray-800 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Boxmag.eu</p>
                  <p className="mt-1">Stefan cel Mare 131 street</p>
                  <p>RO-725400 Radauti, Suceava</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FaPhoneAlt className="w-5 h-5 text-gray-800 shrink-0" />
                <p>
                  <span className="font-bold text-gray-900">Tel:</span> +40 799
                  553 345
                </p>
              </div>
              <div className="flex items-center gap-3">
                <FaEnvelope className="w-5 h-5 text-gray-800 shrink-0" />
                <p>
                  <span className="font-bold text-gray-900">Mail:</span>{" "}
                  info@boxmag.eu
                </p>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-[260px] lg:min-h-[320px] relative flex items-center justify-center">
            <Image
              src="/svgs/location.svg"
              alt="Store location"
              width={324}
              height={284}
              className="w-full max-w-md h-auto object-contain"
            />
          </div>
        </div>
      </section>

      <ServicesSection />
      <HaveAQuestion />
      <NewsletterSubscribe />
    </div>
  );
}
