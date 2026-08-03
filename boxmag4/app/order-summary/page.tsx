"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { B2b } from "../global/components/b2b";
import ResponsiveLayoutWithPadding from "../ResponsiveLayoutWithPadding";
import { Bar } from "../business/components/Bar";
import { B2bProfessionalsSection } from "../business/components/B2bProfessionalsSection";
import { ServicesSection } from "../global/components/services-section";
import { HaveAQuestion } from "../global/components/have-a-question";
import { NewsletterSubscribe } from "../global/components/newsletter-subscribe";
import useBusinessStore from "../business/store/business_store";
import { isDevelopmentAppEnv } from "../../lib/app-env";
import { useLanguage } from "../i18n/language-context";
import useBusinessOrderStore from "../stores/business_order_store";
import { useNotification } from "../global/components/notification-center";
import europeanCountries from "./european-countries.json";
import type { VatLookupAddressFields } from "../../lib/parse-vat-address";
import {
  fetchVatLookup,
  getCachedVatCompany,
} from "../../lib/vat-company";
import { getBackendBaseUrl } from "../../lib/backend-url";
import {
  formatOrderNumber,
  writeB2bOrderSuccessPayload,
} from "../../lib/b2b-order-success";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red";
const lockedInputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 text-gray-600 cursor-not-allowed focus:outline-none";
const invalidInputClass =
  "w-full rounded-lg border border-red-500 bg-red-50 px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500";
const VAT_NUMBER_REGEX = /^([A-Z]{2})?[A-Z0-9]{2,12}$/i;
const VAT_LOOKUP_REGEX = /^[A-Z]{2}[A-Z0-9]{2,12}$/;

function normalizeVatNumber(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

const AUTH_EMAIL_STORAGE_KEY = "boxmag.auth.email";
const AUTH_STORAGE_KEY = "boxmag.auth.loggedIn";
const EUROPEAN_COUNTRY_CODES = new Set(
  europeanCountries.map((country) => country.code),
);
type RequiredFieldKey =
  | "firstName"
  | "surname"
  | "companyName"
  | "vatNumber"
  | "email"
  | "phone"
  | "address"
  | "postcode"
  | "city"
  | "country";

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-wrap justify-between items-baseline gap-x-4 gap-y-1 py-2.5 border-b border-gray-200 last:border-b-0">
      <span className="font-bold text-gray-800">{label}</span>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}

export default function OrderSummaryPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { notify } = useNotification();
  const isDevelopment = isDevelopmentAppEnv();
  const [firstName, setFirstName] = useState(() => (isDevelopment ? "Test" : ""));
  const [surname, setSurname] = useState(() => (isDevelopment ? "Dev" : ""));
  const [companyName, setCompanyName] = useState("");
  const [vatNumber, setVatNumber] = useState(() =>
    isDevelopment ? "RO 2816464" : "",
  );
  const [email, setEmail] = useState(() =>
    isDevelopment ? "test@dev.local" : "",
  );
  const [phone, setPhone] = useState(() => (isDevelopment ? "0700000000" : ""));
  const [address, setAddress] = useState(() =>
    isDevelopment ? "Str. Test nr. 1" : "",
  );
  const [postcode, setPostcode] = useState(() => (isDevelopment ? "400000" : ""));
  const [city, setCity] = useState(() => (isDevelopment ? "Cluj-Napoca" : ""));
  const [country, setCountry] = useState(() => (isDevelopment ? "RO" : ""));
  const [consentPhone, setConsentPhone] = useState(true);
  const [consentEmail, setConsentEmail] = useState(true);
  const [consentPhoneError, setConsentPhoneError] = useState("");
  const [consentEmailError, setConsentEmailError] = useState("");
  const [vatFormatError, setVatFormatError] = useState(false);
  const [isLookingUpVat, setIsLookingUpVat] = useState(false);
  const [vatLookupError, setVatLookupError] = useState<string | null>(null);
  const [requiredFieldErrors, setRequiredFieldErrors] = useState<Record<RequiredFieldKey, boolean>>({
    firstName: false,
    surname: false,
    companyName: false,
    vatNumber: false,
    email: false,
    phone: false,
    address: false,
    postcode: false,
    city: false,
    country: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSucceeded, setSubmitSucceeded] = useState(false);
  const [hasLoadedAccountDefaults, setHasLoadedAccountDefaults] = useState(false);
  const [lockedAccountEmail, setLockedAccountEmail] = useState<string | null>(null);

  const boxes = useBusinessStore((s) => s.boxes);
  const carboardTypes = useBusinessStore((s) => s.carboarbonTypeOptions);
  const boxColors = useBusinessStore((s) => s.boxColorOptions);
  const boxPrints = useBusinessStore((s) => s.boxPrintOptions);
  const typeOfSizes = useBusinessStore((s) => s.typeOfSizes);
  const transportOptions = useBusinessStore((s) => s.transportOptions);
  const draft = useBusinessOrderStore((s) => s.draft);

  const selectedBox = boxes.find((b) => b.isSelected);
  const selectedType = carboardTypes.find((t) => t.isSelected);
  const selectedColor = boxColors.find((c) => c.isSelected);
  const selectedPrint = boxPrints.find((p) => p.isSelected);
  const selectedSizeType = typeOfSizes.find((t) => t.isSelected);
  const selectedTransport = transportOptions.find((t) => t.isSelected);
  const hasRequiredOrderData =
    Boolean(selectedBox) &&
    Boolean(selectedType) &&
    Boolean(selectedColor) &&
    Boolean(selectedPrint) &&
    Boolean(selectedSizeType) &&
    Boolean(selectedTransport) &&
    Boolean(draft.length) &&
    Boolean(draft.width) &&
    Boolean(draft.height) &&
    Boolean(draft.quantity) &&
    draft.acceptedTerms;
  const backendBaseUrl = getBackendBaseUrl();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem(AUTH_STORAGE_KEY) === "true";
    const loggedInEmail = localStorage.getItem(AUTH_EMAIL_STORAGE_KEY)?.trim() ?? "";
    if (isLoggedIn && loggedInEmail) {
      setLockedAccountEmail(loggedInEmail);
      setEmail(loggedInEmail);
    }
  }, []);

  useEffect(() => {
    if (hasLoadedAccountDefaults) return;

    const isLoggedIn = localStorage.getItem(AUTH_STORAGE_KEY) === "true";
    const loggedInEmail = localStorage.getItem(AUTH_EMAIL_STORAGE_KEY)?.trim() ?? "";
    if (!isLoggedIn || !loggedInEmail) {
      setHasLoadedAccountDefaults(true);
      return;
    }

    setLockedAccountEmail(loggedInEmail);
    setEmail(loggedInEmail);

    let isCancelled = false;
    const loadAccountDefaults = async () => {
      try {
        const [profileResponse, addressesResponse] = await Promise.all([
          fetch(`${backendBaseUrl}/api/auth/profile`, {
            credentials: "include",
          }),
          fetch(`${backendBaseUrl}/api/addresses`, {
            credentials: "include",
          }),
        ]);

        const profilePayload = (await profileResponse.json()) as {
          ok?: boolean;
          data?: {
            firstName?: string;
            lastName?: string;
            phone?: string;
            email?: string;
            vatNumber?: string;
            companyName?: string;
          };
        };
        const addressesPayload = (await addressesResponse.json()) as {
          ok?: boolean;
          data?: Array<{
            companyName?: string;
            addressLine1?: string;
            addressLine2?: string;
            postcode?: string;
            city?: string;
            country?: string;
            phone?: string;
            isDefaultShipping?: boolean;
            isDefaultBilling?: boolean;
          }>;
        };

        if (isCancelled) return;

        const addresses = Array.isArray(addressesPayload.data)
          ? addressesPayload.data
          : [];
        const defaultAddress =
          addresses.find((entry) => entry.isDefaultShipping) ??
          addresses.find((entry) => entry.isDefaultBilling) ??
          addresses[0] ??
          null;

        const normalizeCountry = (value: string | undefined): string => {
          const normalized = (value ?? "").trim().toUpperCase();
          if (EUROPEAN_COUNTRY_CODES.has(normalized)) {
            return normalized;
          }
          return "";
        };

        if (profileResponse.ok && profilePayload.ok === true && profilePayload.data) {
          setEmail(loggedInEmail);
          const profileFirstName = String(profilePayload.data?.firstName ?? "").trim();
          const profileLastName = String(profilePayload.data?.lastName ?? "").trim();
          setFirstName((prev) => prev || profileFirstName);
          setSurname((prev) => prev || profileLastName);
          const profileVat = String(profilePayload.data?.vatNumber ?? "").trim();
          const profileCompany =
            String(profilePayload.data?.companyName ?? "").trim() ||
            String(defaultAddress?.companyName ?? "").trim();
          setVatNumber((prev) => prev || profileVat);
          if (profileCompany) {
            setCompanyName((prev) => prev.trim() || profileCompany);
          }
          const profilePhone = String(profilePayload.data?.phone ?? "").trim();
          if (profilePhone) {
            setPhone(profilePhone);
          }
        } else {
          setEmail(loggedInEmail);
        }

        if (defaultAddress) {
          setAddress((prev) =>
            prev ||
            [defaultAddress.addressLine1, defaultAddress.addressLine2]
              .filter(Boolean)
              .join(", "),
          );
          setPostcode((prev) => prev || String(defaultAddress.postcode ?? ""));
          setCity((prev) => prev || String(defaultAddress.city ?? ""));
          setCountry((prev) => prev || normalizeCountry(defaultAddress.country));
          const addressPhone = String(defaultAddress.phone ?? "").trim();
          if (addressPhone) {
            setPhone((prev) => prev.trim() || addressPhone);
          }
        }
      } catch (_error) {
        if (!isCancelled) {
          setEmail(loggedInEmail);
        }
      } finally {
        if (!isCancelled) {
          setHasLoadedAccountDefaults(true);
        }
      }
    };

    void loadAccountDefaults();
    return () => {
      isCancelled = true;
    };
  }, [backendBaseUrl, hasLoadedAccountDefaults]);

  useEffect(() => {
    const normalizedVat = normalizeVatNumber(vatNumber);
    if (!VAT_LOOKUP_REGEX.test(normalizedVat)) {
      setCompanyName("");
      setVatLookupError(null);
      return;
    }

    const cachedCompany = getCachedVatCompany(normalizedVat);
    if (cachedCompany) {
      setCompanyName((prev) => prev.trim() || cachedCompany);
      setVatLookupError(null);
      setIsLookingUpVat(false);
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsLookingUpVat(true);
      setVatLookupError(null);

      try {
        const payload = await fetchVatLookup(normalizedVat, controller.signal);

        if (isCancelled) return;

        if (payload.ok !== true || !payload.companyName) {
          setCompanyName("");
          setVatLookupError(payload.message ?? t("contact.vatLookupFailed"));
          return;
        }

        const lookupFields: VatLookupAddressFields = {
          companyName: payload.companyName,
          addressLine1: payload.addressLine1,
          addressLine2: payload.addressLine2,
          city: payload.city,
          postcode: payload.postcode,
          country: payload.country,
          phone: payload.phone,
        };
        const addressFromLookup = [lookupFields.addressLine1, lookupFields.addressLine2]
          .filter(Boolean)
          .join(", ");
        const lookupCountry = lookupFields.country?.trim().toUpperCase() ?? "";

        setCompanyName(
          (prev) => prev.trim() || lookupFields.companyName?.trim() || "",
        );
        setAddress((prev) => prev.trim() || addressFromLookup || prev);
        setPostcode((prev) => prev.trim() || lookupFields.postcode?.trim() || prev);
        setCity((prev) => prev.trim() || lookupFields.city?.trim() || prev);
        setCountry((prev) => {
          if (prev.trim()) return prev;
          if (lookupCountry && EUROPEAN_COUNTRY_CODES.has(lookupCountry)) {
            return lookupCountry;
          }
          return lookupFields.country?.trim() || prev;
        });
        setVatLookupError(null);
      } catch (error) {
        if (isCancelled || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }
        setCompanyName("");
        setVatLookupError(t("contact.vatLookupFailed"));
      } finally {
        if (!isCancelled) {
          setIsLookingUpVat(false);
        }
      }
    }, 600);

    return () => {
      isCancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [vatNumber, t]);

  useEffect(() => {
    if (submitSucceeded) return;
    if (!hasRequiredOrderData) {
      router.replace("/business");
    }
  }, [hasRequiredOrderData, router, submitSucceeded]);

  const orderRows = [
    { label: t("orderSummary.boxType"), value: selectedBox?.name ?? "—" },
    { label: t("orderSummary.cardboardType"), value: selectedType?.name ?? "—" },
    { label: t("orderSummary.cardboardColour"), value: selectedColor?.name ?? "—" },
    {
      label: t("orderSummary.boxPrint"),
      value: selectedPrint ? (selectedPrint.name === "1 Color" ? "1 Colour" : selectedPrint.name) : "—",
    },
    {
      label: t("orderSummary.boxSize"),
      value:
        draft.length && draft.width && draft.height
          ? `${draft.length} x ${draft.width} x ${draft.height} mm${selectedSizeType ? ` (${selectedSizeType.name})` : ""}`
          : "—",
    },
    { label: t("orderSummary.transport"), value: selectedTransport?.name ?? "—" },
    { label: t("orderSummary.quantity"), value: draft.quantity || "—" },
    { label: t("orderSummary.ftl"), value: t("orderSummary.no") },
    {
      label: t("orderSummary.attachment"),
      value: draft.attachmentName ? draft.attachmentName : t("orderSummary.no"),
    },
    {
      label: t("orderSummary.message"),
      value: draft.message ? draft.message : t("orderSummary.no"),
    },
  ];

  const handleSubmitOrder = async () => {
    setConsentPhoneError("");
    setConsentEmailError("");

    const contactFields: Array<{ key: RequiredFieldKey; value: string }> = [
      { key: "firstName", value: firstName },
      { key: "surname", value: surname },
      { key: "companyName", value: companyName },
      { key: "vatNumber", value: vatNumber },
      { key: "email", value: email },
      { key: "phone", value: phone },
      { key: "address", value: address },
      { key: "postcode", value: postcode },
      { key: "city", value: city },
      { key: "country", value: country },
    ];
    const nextRequiredFieldErrors = contactFields.reduce<Record<RequiredFieldKey, boolean>>(
      (acc, field) => {
        acc[field.key] = field.value.trim().length === 0;
        return acc;
      },
      {
        firstName: false,
        surname: false,
        companyName: false,
        vatNumber: false,
        email: false,
        phone: false,
        address: false,
        postcode: false,
        city: false,
        country: false,
      },
    );
    setRequiredFieldErrors(nextRequiredFieldErrors);

    if (isLookingUpVat) {
      notify({
        type: "error",
        message: t("contact.vatLookupInProgress"),
      });
      return;
    }

    if (Object.values(nextRequiredFieldErrors).some(Boolean)) {
      notify({
        type: "error",
        message: t("orderSummary.errors.completeRequiredFields"),
      });
      return;
    }

    const normalizedVat = normalizeVatNumber(vatNumber);
    if (!VAT_NUMBER_REGEX.test(normalizedVat)) {
      setVatFormatError(true);
      notify({
        type: "error",
        message: "Codul TVA trebuie sa fie in format valid (ex: RO12345678, RO 12345678).",
      });
      return;
    }

    if (!companyName.trim()) {
      notify({
        type: "error",
        message: vatLookupError ?? t("contact.vatLookupFailed"),
      });
      return;
    }

    if (!draft.acceptedTerms) {
      notify({
        type: "error",
        message: t("orderSummary.errors.acceptTermsStep2"),
      });
      return;
    }

    if (!consentPhone || !consentEmail) {
      if (!consentPhone) {
        setConsentPhoneError(t("orderSummary.errors.consentPhoneRequired"));
      }
      if (!consentEmail) {
        setConsentEmailError(t("orderSummary.errors.consentEmailRequired"));
      }
      notify({
        type: "error",
        message: t("orderSummary.errors.bothConsentsRequired"),
      });
      return;
    }

    if (!selectedBox || !selectedType || !selectedColor || !selectedPrint || !selectedSizeType || !selectedTransport) {
      notify({
        type: "error",
        message: t("orderSummary.errors.orderDetailsIncomplete"),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const orderEmail = lockedAccountEmail ?? email.trim();

      const response = await fetch(`${backendBaseUrl}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(lockedAccountEmail ? { accountEmail: lockedAccountEmail } : {}),
          boxTypeId: selectedBox.id,
          boxTypeName: selectedBox.name,
          cardboardType: selectedType.name,
          cardboardColour: selectedColor.name,
          boxPrint: selectedPrint.name === "1 Color" ? "1 Colour" : selectedPrint.name,
          lengthMm: draft.length,
          widthMm: draft.width,
          heightMm: draft.height,
          sizeType: selectedSizeType.name,
          transport: selectedTransport.name,
          quantity: draft.quantity,
          ftl: false,
          attachmentName: draft.attachmentName || null,
          attachmentBase64: draft.attachmentBase64 || null,
          attachmentMimeType: draft.attachmentMimeType || null,
          message: draft.message,
          acceptedTerms: draft.acceptedTerms,
          firstName,
          surname,
          companyName,
          vatNumber: normalizedVat || null,
          email: orderEmail,
          phone,
          address,
          postcode,
          city,
          country,
          consentPhone,
          consentEmail,
        }),
      });

      const responseText = await response.text();
      let payload: { ok?: boolean; message?: string; data?: { id?: number } };
      try {
        payload = JSON.parse(responseText) as {
          ok?: boolean;
          message?: string;
          data?: { id?: number };
        };
      } catch {
        if (response.status === 413) {
          throw new Error(
            "File is too large. Maximum allowed size is 18 MB.",
          );
        }
        throw new Error(`Server error (${response.status}). Please try again.`);
      }
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.message ?? `Failed with status ${response.status}`);
      }

      const orderId = payload.data?.id;
      if (typeof orderId !== "number" || orderId <= 0) {
        throw new Error("Order was created but no order id was returned.");
      }

      writeB2bOrderSuccessPayload({
        orderId,
        orderNumber: formatOrderNumber(orderId),
        email: orderEmail,
        firstName: firstName.trim(),
        surname: surname.trim(),
        companyName: companyName.trim(),
        vatNumber: normalizedVat,
        phone: phone.trim(),
        isGuest: !lockedAccountEmail,
      });

      setSubmitSucceeded(true);
      notify({
        type: "success",
        message: "Order sent successfully.",
      });
      router.push("/business/order-success");
    } catch (error) {
      notify({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to send order.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasRequiredOrderData) {
    return null;
  }

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
          <Link href="/business" className="hover:underline">
            {t("common.b2b")}
          </Link>{" "}
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">{t("orderSummary.title")}</span>
        </div>
      </section>

      <div className="pt-8 md:pt-12 lg:pt-16" />
      <ResponsiveLayoutWithPadding>
        <Bar />

        <div className="pt-8 md:pt-12 lg:pt-16" />

        {/* Order Summary bar */}
        <div className="bg-my-red w-full flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-3 sm:pl-8 sm:pr-4 sm:py-4 rounded-t-lg text-my-white">
          <span className="font-bold text-base sm:text-lg">{t("orderSummary.title")}</span>
        </div>

        {/* Order details list */}
        <div className="w-full rounded-b-lg border-2 border-t-0 border-my-light-gray bg-white px-6 py-4 sm:px-8 sm:py-5 text-gray-800">
          {orderRows.map((row) => (
            <SummaryRow key={row.label} label={row.label} value={row.value} />
          ))}
        </div>

        <div className="pt-8 md:pt-12 lg:pt-16" />

        {/* Picture 1: Contact form */}
        <div className="bg-my-red w-full flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-3 sm:pl-8 sm:pr-4 sm:py-4 rounded-t-lg text-my-white">
          <span className="font-bold text-base sm:text-lg">{t("orderSummary.contact")}</span>
        </div>
        <div className="w-full rounded-b-lg border-2 border-t-0 border-my-light-gray bg-white px-6 py-6 sm:px-8 sm:py-8">
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="os-firstName" className="block text-sm font-semibold text-gray-800 mb-1">{t("orderSummary.firstName")}</label>
                <input id="os-firstName" type="text" value={firstName} onChange={(e) => {
                  setFirstName(e.target.value);
                  if (e.target.value.trim().length > 0 && requiredFieldErrors.firstName) {
                    setRequiredFieldErrors((prev) => ({ ...prev, firstName: false }));
                  }
                }} placeholder={t("orderSummary.firstName")} className={requiredFieldErrors.firstName ? invalidInputClass : inputClass} />
                {requiredFieldErrors.firstName ? <p className="mt-1 text-sm text-red-600">{t("orderSummary.errors.firstNameRequired")}</p> : null}
              </div>
              <div>
                <label htmlFor="os-surname" className="block text-sm font-semibold text-gray-800 mb-1">{t("orderSummary.surname")}</label>
                <input id="os-surname" type="text" value={surname} onChange={(e) => {
                  setSurname(e.target.value);
                  if (e.target.value.trim().length > 0 && requiredFieldErrors.surname) {
                    setRequiredFieldErrors((prev) => ({ ...prev, surname: false }));
                  }
                }} placeholder={t("orderSummary.surname")} className={requiredFieldErrors.surname ? invalidInputClass : inputClass} />
                {requiredFieldErrors.surname ? <p className="mt-1 text-sm text-red-600">{t("orderSummary.errors.surnameRequired")}</p> : null}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="os-vatNumber" className="block text-sm font-semibold text-gray-800 mb-1">{t("orderSummary.vatNumber")}</label>
                <input id="os-vatNumber" type="text" value={vatNumber} onChange={(e) => {
                  const nextValue = e.target.value.toUpperCase();
                  setVatNumber(nextValue);
                  if (e.target.value.trim().length > 0 && requiredFieldErrors.vatNumber) {
                    setRequiredFieldErrors((prev) => ({ ...prev, vatNumber: false }));
                  }
                  if (VAT_NUMBER_REGEX.test(normalizeVatNumber(nextValue)) && vatFormatError) {
                    setVatFormatError(false);
                  }
                }} placeholder={t("orderSummary.vatNumber")} pattern="^([A-Za-z]{2})?\s?[A-Za-z0-9]{2,12}$" title="Format valid: RO12345678, RO 12345678, DE123456789 sau 12345678" className={requiredFieldErrors.vatNumber || vatFormatError || vatLookupError ? invalidInputClass : inputClass} autoComplete="off" required />
                {isLookingUpVat ? (
                  <p className="mt-1 text-sm text-gray-500">{t("contact.vatLookupLoading")}</p>
                ) : null}
                {requiredFieldErrors.vatNumber ? <p className="mt-1 text-sm text-red-600">{t("orderSummary.errors.vatNumberRequired")}</p> : null}
                {!requiredFieldErrors.vatNumber && vatFormatError ? <p className="mt-1 text-sm text-red-600">Format invalid. Exemple: RO12345678, RO 12345678, DE123456789</p> : null}
                {!requiredFieldErrors.vatNumber && !vatFormatError && !isLookingUpVat && vatLookupError ? (
                  <p className="mt-1 text-sm text-red-600">{vatLookupError}</p>
                ) : null}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="os-companyName" className="block text-sm font-semibold text-gray-800 mb-1">{t("orderSummary.companyName")}</label>
                <input
                  id="os-companyName"
                  type="text"
                  readOnly
                  value={companyName}
                  placeholder={
                    isLookingUpVat
                      ? t("contact.vatLookupLoading")
                      : t("contact.companyNameAuto")
                  }
                  className={lockedInputClass}
                  aria-busy={isLookingUpVat}
                  required
                />
                {requiredFieldErrors.companyName ? <p className="mt-1 text-sm text-red-600">{t("orderSummary.errors.companyNameRequired")}</p> : null}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="os-email" className="block text-sm font-semibold text-gray-800 mb-1">{t("orderSummary.email")}</label>
                <input
                  id="os-email"
                  type="email"
                  value={email}
                  readOnly={lockedAccountEmail != null}
                  disabled={lockedAccountEmail != null}
                  onChange={(e) => {
                    if (lockedAccountEmail != null) return;
                    setEmail(e.target.value);
                    if (e.target.value.trim().length > 0 && requiredFieldErrors.email) {
                      setRequiredFieldErrors((prev) => ({ ...prev, email: false }));
                    }
                  }}
                  placeholder="you@yourwebsite.com"
                  className={
                    lockedAccountEmail != null
                      ? lockedInputClass
                      : requiredFieldErrors.email
                        ? invalidInputClass
                        : inputClass
                  }
                />
                {lockedAccountEmail != null ? (
                  <p className="mt-1 text-sm text-gray-600">{t("orderSummary.emailLockedHint")}</p>
                ) : null}
                {requiredFieldErrors.email ? <p className="mt-1 text-sm text-red-600">{t("orderSummary.errors.emailRequired")}</p> : null}
              </div>
              <div>
                <label htmlFor="os-phone" className="block text-sm font-semibold text-gray-800 mb-1">{t("orderSummary.phone")}</label>
                <input id="os-phone" type="tel" value={phone} onChange={(e) => {
                  setPhone(e.target.value);
                  if (e.target.value.trim().length > 0 && requiredFieldErrors.phone) {
                    setRequiredFieldErrors((prev) => ({ ...prev, phone: false }));
                  }
                }} placeholder={t("orderSummary.phone")} className={requiredFieldErrors.phone ? invalidInputClass : inputClass} />
                {requiredFieldErrors.phone ? <p className="mt-1 text-sm text-red-600">{t("orderSummary.errors.phoneRequired")}</p> : null}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="os-address" className="block text-sm font-semibold text-gray-800 mb-1">{t("orderSummary.address")}</label>
                <input id="os-address" type="text" value={address} onChange={(e) => {
                  setAddress(e.target.value);
                  if (e.target.value.trim().length > 0 && requiredFieldErrors.address) {
                    setRequiredFieldErrors((prev) => ({ ...prev, address: false }));
                  }
                }} placeholder={t("orderSummary.address")} className={requiredFieldErrors.address ? invalidInputClass : inputClass} />
                {requiredFieldErrors.address ? <p className="mt-1 text-sm text-red-600">{t("orderSummary.errors.addressRequired")}</p> : null}
              </div>
              <div>
                <label htmlFor="os-postcode" className="block text-sm font-semibold text-gray-800 mb-1">{t("orderSummary.postcode")}</label>
                <input id="os-postcode" type="text" value={postcode} onChange={(e) => {
                  setPostcode(e.target.value);
                  if (e.target.value.trim().length > 0 && requiredFieldErrors.postcode) {
                    setRequiredFieldErrors((prev) => ({ ...prev, postcode: false }));
                  }
                }} placeholder={t("orderSummary.postcode")} className={requiredFieldErrors.postcode ? invalidInputClass : inputClass} />
                {requiredFieldErrors.postcode ? <p className="mt-1 text-sm text-red-600">{t("orderSummary.errors.postcodeRequired")}</p> : null}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="os-city" className="block text-sm font-semibold text-gray-800 mb-1">{t("orderSummary.city")}</label>
                <input id="os-city" type="text" value={city} onChange={(e) => {
                  setCity(e.target.value);
                  if (e.target.value.trim().length > 0 && requiredFieldErrors.city) {
                    setRequiredFieldErrors((prev) => ({ ...prev, city: false }));
                  }
                }} placeholder={t("orderSummary.city")} className={requiredFieldErrors.city ? invalidInputClass : inputClass} />
                {requiredFieldErrors.city ? <p className="mt-1 text-sm text-red-600">{t("orderSummary.errors.cityRequired")}</p> : null}
              </div>
              <div>
                <label htmlFor="os-country" className="block text-sm font-semibold text-gray-800 mb-1">{t("orderSummary.country")}</label>
                <select id="os-country" value={country} onChange={(e) => {
                  setCountry(e.target.value);
                  if (e.target.value.trim().length > 0 && requiredFieldErrors.country) {
                    setRequiredFieldErrors((prev) => ({ ...prev, country: false }));
                  }
                }} className={requiredFieldErrors.country ? invalidInputClass : inputClass}>
                  <option value="">{t("orderSummary.country")}</option>
                  {europeanCountries.map((countryOption) => (
                    <option key={countryOption.code} value={countryOption.code}>
                      {countryOption.name}
                    </option>
                  ))}
                </select>
                {requiredFieldErrors.country ? <p className="mt-1 text-sm text-red-600">{t("orderSummary.errors.countryRequired")}</p> : null}
              </div>
            </div>
          </form>
        </div>

        <div className="pt-8 md:pt-12 lg:pt-16" />

        {/* Picture 2: Checkboxes and PREV/NEXT */}
        <div className="w-full space-y-4">
          <label className="flex gap-3 items-start cursor-pointer">
            <input
              type="checkbox"
              checked={consentPhone}
              onChange={(e) => {
                setConsentPhone(e.target.checked);
                if (e.target.checked) setConsentPhoneError("");
              }}
              className={`mt-1 h-5 w-5 shrink-0 rounded border-2 bg-white accent-my-red focus:ring-my-red ${
                consentPhoneError ? "border-red-500" : "border-gray-300"
              }`}
            />
            <span className="text-sm text-gray-600">
              {t("orderSummary.consentPhone")}
            </span>
          </label>
          {consentPhoneError ? (
            <p className="-mt-2 text-sm text-red-600">{consentPhoneError}</p>
          ) : null}
          <label className="flex gap-3 items-start cursor-pointer">
            <input
              type="checkbox"
              checked={consentEmail}
              onChange={(e) => {
                setConsentEmail(e.target.checked);
                if (e.target.checked) setConsentEmailError("");
              }}
              className={`mt-1 h-5 w-5 shrink-0 rounded border-2 bg-white accent-my-red focus:ring-my-red ${
                consentEmailError ? "border-red-500" : "border-gray-300"
              }`}
            />
            <span className="text-sm text-gray-600">
              {t("orderSummary.consentEmail")}
            </span>
          </label>
          {consentEmailError ? (
            <p className="-mt-2 text-sm text-red-600">{consentEmailError}</p>
          ) : null}
          <div className="flex flex-wrap justify-between gap-4 pt-4">
            <Link href="/business" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-my-red hover:bg-my-red/90 text-white font-semibold transition-colors">
              <span>←</span> {t("common.prev")}
            </Link>
            <button
              type="button"
              onClick={() => void handleSubmitOrder()}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-my-red hover:bg-my-red/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold transition-colors"
            >
              {isSubmitting ? "Sending..." : t("common.next")} <span>→</span>
            </button>
          </div>
        </div>

        <div className="pt-8 md:pt-12 lg:pt-16" />
      </ResponsiveLayoutWithPadding>

      <B2bProfessionalsSection />

      {/* Thank you banner */}
      <section className="w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pictures/thank-you-banner.png" alt="Thank you for shopping" className="w-full h-auto object-cover" />
      </section>

      <ServicesSection />
      <HaveAQuestion />
      <NewsletterSubscribe />
    </div>
  );
}
