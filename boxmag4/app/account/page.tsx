"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { B2b } from "../global/components/b2b";
import { ServicesSection } from "../global/components/services-section";
import { HaveAQuestion } from "../global/components/have-a-question";
import { NewsletterSubscribe } from "../global/components/newsletter-subscribe";
import { useLanguage } from "../i18n/language-context";
import {
  FaUser,
  FaMapMarkerAlt,
  FaBoxOpen,
  FaSignOutAlt,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import { isDevelopmentAppEnv } from "../../lib/app-env";
import {
  AUTH_CHANGED_EVENT,
  AUTH_EMAIL_STORAGE_KEY,
  AUTH_STORAGE_KEY,
  clearCustomerAuthLocalState,
} from "../../lib/customer-auth";
import { siteEmails } from "../../lib/site-emails";
import {
  fetchVatLookup,
  getCachedVatCompany,
  rememberVatCompany,
} from "../../lib/vat-company";
import { getBackendBaseUrl } from "../../lib/backend-url";

type Tab = "account" | "address" | "orders";

const TAB_HASHES: Tab[] = ["account", "address", "orders"];

function tabFromHash(hash: string): Tab | null {
  const normalized = hash.replace(/^#/, "").toLowerCase();
  return TAB_HASHES.includes(normalized as Tab) ? (normalized as Tab) : null;
}

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red";

const lockedInputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 text-gray-600 cursor-not-allowed focus:outline-none";

const sectionTitleClass = "text-lg font-bold text-gray-900 mb-1";

const sectionSubtitleClass = "text-sm text-gray-500 mb-5";

const saveBtnClass =
  "px-6 py-2.5 rounded-lg bg-my-red text-white font-semibold text-sm hover:bg-my-red/90 transition-colors";

const VAT_NUMBER_REGEX = /^[A-Z]{2}[A-Z0-9]{2,12}$/;

function normalizeVatNumber(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

const isDevelopment = isDevelopmentAppEnv();

type UserProfile = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  companyName: string;
  vatNumber: string;
};

type UserAddress = {
  id: number;
  label: string;
  companyName: string;
  firstName: string;
  lastName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  postcode: string;
  city: string;
  country: string;
  isDefaultBilling: boolean;
  isDefaultShipping: boolean;
};

type UserOrder = {
  id: number;
  orderNumber: string;
  status: string;
  createdAt: string;
};

function LoginRequiredView({
  t,
  sessionExpired = false,
  onLoginSuccess,
}: {
  t: (key: string) => string;
  sessionExpired?: boolean;
  onLoginSuccess: (email: string) => void;
}) {
  const [email, setEmail] = useState(
    isDevelopment ? siteEmails.devDemoCustomer : "",
  );
  const [password, setPassword] = useState(isDevelopment ? "dummy123" : "");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError(t("account.error.enterCredentials"));
      return;
    }

    const backendBaseUrl = getBackendBaseUrl();
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${backendBaseUrl}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.message ?? t("account.error.invalidCredentials"));
      }

      localStorage.setItem(AUTH_STORAGE_KEY, "true");
      localStorage.setItem(AUTH_EMAIL_STORAGE_KEY, normalizedEmail);
      window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
      onLoginSuccess(normalizedEmail);
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : t("account.error.invalidCredentials"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl rounded-lg border border-gray-200 bg-white p-6 sm:p-8">
      <h2 className="text-2xl font-bold text-gray-900">{t("account.signInTitle")}</h2>
      <p className="mt-2 text-sm text-gray-600">
        {t("account.signInHint")}
      </p>
      {sessionExpired ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          {t("account.sessionExpired")}
        </p>
      ) : null}
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="account-login-email"
            className="mb-1 block text-xs font-semibold uppercase text-gray-500"
          >
            {t("account.emailAddress")}
          </label>
          <input
            id="account-login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label
            htmlFor="account-login-password"
            className="mb-1 block text-xs font-semibold uppercase text-gray-500"
          >
            {t("account.password")}
          </label>
          <div className="relative">
            <input
              id="account-login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pr-12`}
              placeholder={t("account.passwordPlaceholder")}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
              aria-label={
                showPassword
                  ? t("registration.hidePassword")
                  : t("registration.showPassword")
              }
            >
              {showPassword ? (
                <FaEyeSlash className="h-4 w-4" />
              ) : (
                <FaEye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        {error ? (
          <p className="text-sm font-medium text-red-700">{error}</p>
        ) : null}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
          <button
            type="submit"
            className={saveBtnClass}
            disabled={isSubmitting}
          >
            {isSubmitting ? t("account.signingIn") : t("account.signInButton")}
          </button>
          <Link
            href="/registration"
            className="text-sm font-semibold text-my-red hover:underline"
          >
            {t("account.newUserRegister")}
          </Link>
        </div>
      </form>
    </div>
  );
}

/* ─── Tab content: MY ACCOUNT ─────────────────────────────── */
function MyAccountTab({
  t,
  profile,
  onSaveProfile,
}: {
  t: (key: string) => string;
  profile: UserProfile;
  onSaveProfile: (payload: {
    firstName: string;
    lastName: string;
    phone: string;
    companyName: string;
    vatNumber: string;
  }) => Promise<void>;
}) {
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone);
  const [companyName, setCompanyName] = useState(profile.companyName);
  const [vatNumber, setVatNumber] = useState(profile.vatNumber);
  const [isLookingUpVat, setIsLookingUpVat] = useState(false);
  const [vatLookupError, setVatLookupError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setPhone(profile.phone);
    setCompanyName(profile.companyName);
    setVatNumber(profile.vatNumber);
  }, [profile]);

  useEffect(() => {
    if (!saveSuccess) return;
    const timer = window.setTimeout(() => {
      setSaveSuccess(null);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [saveSuccess]);

  useEffect(() => {
    const normalizedVat = normalizeVatNumber(vatNumber);
    if (!VAT_NUMBER_REGEX.test(normalizedVat)) {
      setCompanyName("");
      setVatLookupError(null);
      return;
    }

    const cachedCompany = getCachedVatCompany(normalizedVat);
    if (cachedCompany) {
      setCompanyName(cachedCompany);
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
          setVatLookupError(
            payload.message ?? t("contact.vatLookupFailed"),
          );
          return;
        }

        setCompanyName(payload.companyName);
        setVatLookupError(null);
      } catch (error) {
        if (
          isCancelled ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
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

  const handleSave = async () => {
    if (!profile.email) {
      setSaveError(t("account.error.missingEmail"));
      setSaveSuccess(null);
      return;
    }

    if (isLookingUpVat) {
      setSaveError(t("contact.vatLookupInProgress"));
      setSaveSuccess(null);
      return;
    }

    const normalizedVat = normalizeVatNumber(vatNumber);
    const trimmedCompany = companyName.trim();

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      await onSaveProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        companyName: trimmedCompany,
        vatNumber: normalizedVat,
      });
      if (normalizedVat && trimmedCompany) {
        rememberVatCompany(normalizedVat, trimmedCompany);
      }
      setSaveSuccess(t("account.detailsSaved"));
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : t("account.error.saveProfile"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {saveSuccess ? (
        <div className="fixed right-4 top-4 z-120 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 shadow-lg">
          {saveSuccess}
        </div>
      ) : null}
      {/* Header */}
      <div>
        <h2 className={sectionTitleClass}>{t("account.nav.account")}</h2>
        <p className={sectionSubtitleClass}>{t("account.manageSettings")}</p>
      </div>

      {/* Name */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
          {t("account.nameSection")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="acc-first"
              className="block text-xs font-semibold text-gray-500 mb-1 uppercase"
            >
              {t("contact.firstName")}
            </label>
            <input
              id="acc-first"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t("account.placeholder.firstName")}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="acc-last"
              className="block text-xs font-semibold text-gray-500 mb-1 uppercase"
            >
              {t("contact.surname")}
            </label>
            <input
              id="acc-last"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t("account.placeholder.lastName")}
              className={inputClass}
            />
          </div>
        </div>
        <button type="button" className={saveBtnClass} onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? t("account.saving") : t("account.save")}
        </button>
      </div>

      {/* Business */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
          {t("account.businessSection")}
        </h3>
        <div>
          <label
            htmlFor="acc-vat"
            className="block text-xs font-semibold text-gray-500 mb-1 uppercase"
          >
            {t("contact.vatNumber")}
          </label>
          <input
            id="acc-vat"
            type="text"
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value.toUpperCase())}
            placeholder={t("contact.vatNumber")}
            pattern="[A-Za-z]{2}\s?[A-Za-z0-9]{2,12}"
            title={t("account.vatFormatTitle")}
            className={inputClass}
            aria-describedby={vatLookupError ? "acc-vat-error" : undefined}
            aria-busy={isLookingUpVat}
          />
          {isLookingUpVat ? (
            <p className="mt-1 text-sm text-gray-500">
              {t("contact.vatLookupLoading")}
            </p>
          ) : null}
          {!isLookingUpVat && vatLookupError ? (
            <p id="acc-vat-error" className="mt-1 text-sm text-red-600">
              {vatLookupError}
            </p>
          ) : null}
        </div>
        <div>
          <label
            htmlFor="acc-company"
            className="block text-xs font-semibold text-gray-500 mb-1 uppercase"
          >
            {t("contact.companyName")}
          </label>
          <input
            id="acc-company"
            type="text"
            value={companyName}
            readOnly
            placeholder={
              isLookingUpVat
                ? t("contact.vatLookupLoading")
                : t("contact.companyNameAuto")
            }
            className={lockedInputClass}
            aria-busy={isLookingUpVat}
          />
        </div>
        <button type="button" className={saveBtnClass} onClick={() => void handleSave()} disabled={isSaving || isLookingUpVat}>
          {isSaving ? t("account.saving") : t("account.save")}
        </button>
      </div>

      {/* Contact */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
          {t("account.contactSection")}
        </h3>
        <div>
          <label
            htmlFor="acc-phone"
            className="block text-xs font-semibold text-gray-500 mb-1 uppercase"
          >
            {t("account.phone")}
          </label>
          <input
            id="acc-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+40 700 000 000"
            className={inputClass}
            autoComplete="tel"
          />
        </div>
        <button type="button" className={saveBtnClass} onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? t("account.saving") : t("account.save")}
        </button>
      </div>

      {/* Email */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
          {t("account.emailSection")}
        </h3>
        <div>
          <label
            htmlFor="acc-email"
            className="block text-xs font-semibold text-gray-500 mb-1 uppercase"
          >
            {t("account.emailAddress")}
          </label>
          <input
            id="acc-email"
            type="email"
            value={profile.email || ""}
            readOnly
            className={lockedInputClass}
          />
          <p className="mt-2 text-xs text-gray-500">
            {t("account.emailLockedHint")}
          </p>
        </div>
      </div>
      {saveError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
          {saveError}
        </p>
      ) : null}
    </div>
  );
}

/* ─── Tab content: ADDRESS ────────────────────────────────── */
function AddressTab({
  t,
  addresses,
  isLoading,
  onCreateAddress,
  onUpdateAddress,
  onDeleteAddress,
}: {
  t: (key: string) => string;
  addresses: UserAddress[];
  isLoading: boolean;
  onCreateAddress: (payload: {
    label: string;
    companyName: string;
    firstName: string;
    lastName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    postcode: string;
    city: string;
    country: string;
    isDefaultBilling: boolean;
    isDefaultShipping: boolean;
  }) => Promise<void>;
  onUpdateAddress: (
    addressId: number,
    payload: {
      label: string;
      companyName: string;
      firstName: string;
      lastName: string;
      phone: string;
      addressLine1: string;
      addressLine2: string;
      postcode: string;
      city: string;
      country: string;
      isDefaultBilling: boolean;
      isDefaultShipping: boolean;
    },
  ) => Promise<void>;
  onDeleteAddress: (addressId: number) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [postcode, setPostcode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [isDefaultBilling, setIsDefaultBilling] = useState(true);
  const [isDefaultShipping, setIsDefaultShipping] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<number | null>(
    null,
  );
  const addressFormRef = useRef<HTMLFormElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onCreateAddress({
        label,
        companyName,
        firstName,
        lastName,
        phone,
        addressLine1,
        addressLine2,
        postcode,
        city,
        country,
        isDefaultBilling,
        isDefaultShipping,
      });
      setLabel("");
      setCompanyName("");
      setFirstName("");
      setLastName("");
      setPhone("");
      setAddressLine1("");
      setAddressLine2("");
      setPostcode("");
      setCity("");
      setCountry("");
      setIsDefaultBilling(true);
      setIsDefaultShipping(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("account.error.saveAddress"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditAddress = (address: UserAddress) => {
    setEditingAddressId(address.id);
    setLabel(address.label);
    setCompanyName(address.companyName);
    setFirstName(address.firstName);
    setLastName(address.lastName);
    setPhone(address.phone);
    setAddressLine1(address.addressLine1);
    setAddressLine2(address.addressLine2);
    setPostcode(address.postcode);
    setCity(address.city);
    setCountry(address.country);
    setIsDefaultBilling(address.isDefaultBilling);
    setIsDefaultShipping(address.isDefaultShipping);
    setError(null);
    window.setTimeout(() => {
      addressFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  const cancelEdit = () => {
    setEditingAddressId(null);
    setLabel("");
    setCompanyName("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setAddressLine1("");
    setAddressLine2("");
    setPostcode("");
    setCity("");
    setCountry("");
    setIsDefaultBilling(true);
    setIsDefaultShipping(true);
    setError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAddressId) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await onUpdateAddress(editingAddressId, {
        label,
        companyName,
        firstName,
        lastName,
        phone,
        addressLine1,
        addressLine2,
        postcode,
        city,
        country,
        isDefaultBilling,
        isDefaultShipping,
      });
      cancelEdit();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("account.error.updateAddress"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    setDeletingAddressId(addressId);
    setError(null);
    try {
      await onDeleteAddress(addressId);
      if (editingAddressId === addressId) {
        cancelEdit();
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : t("account.error.deleteAddress"),
      );
    } finally {
      setDeletingAddressId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className={sectionTitleClass}>{t("account.nav.address")}</h2>
        <p className={sectionSubtitleClass}>
          {t("account.manageShippingAddress")}
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
          {t("account.savedAddresses")}
        </h3>
        {isLoading ? (
          <p className="text-sm text-gray-600">{t("account.loadingAddresses")}</p>
        ) : addresses.length === 0 ? (
          <p className="text-sm text-gray-600">{t("account.noSavedAddresses")}</p>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <FaMapMarkerAlt className="mt-0.5 h-4 w-4 shrink-0 text-my-red" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-gray-800">
                      {[address.firstName, address.lastName]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                    {address.companyName ? <p>{address.companyName}</p> : null}
                    {address.label ? (
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        {address.label}
                      </p>
                    ) : null}
                    <p>{address.addressLine1}</p>
                    {address.addressLine2 ? (
                      <p>{address.addressLine2}</p>
                    ) : null}
                    <p>
                      {address.postcode} {address.city}
                    </p>
                    <p>{address.country}</p>
                    {address.phone ? (
                      <p>
                        {t("checkout.address.tel")} {address.phone}
                      </p>
                    ) : null}
                    <p className="text-xs text-gray-500">
                      {address.isDefaultShipping ? t("account.defaultShipping") : ""}
                      {address.isDefaultShipping && address.isDefaultBilling
                        ? " • "
                        : ""}
                      {address.isDefaultBilling ? t("account.defaultBilling") : ""}
                    </p>
                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        className="text-xs font-semibold text-my-red hover:underline"
                        onClick={() => startEditAddress(address)}
                      >
                        {t("account.editAddress")}
                      </button>
                      <button
                        type="button"
                        className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-60"
                        onClick={() => void handleDeleteAddress(address.id)}
                        disabled={deletingAddressId === address.id}
                      >
                        {deletingAddressId === address.id
                          ? t("account.deleting")
                          : t("account.delete")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form
        ref={addressFormRef}
        onSubmit={editingAddressId ? handleSaveEdit : handleSubmit}
        className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6 space-y-4"
      >
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
          {editingAddressId ? t("account.editAddress") : t("account.addNewAddress")}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("account.placeholder.label")}
            className={inputClass}
          />
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder={t("account.placeholder.companyName")}
            className={inputClass}
          />
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder={t("account.placeholder.firstNameRequired")}
            className={inputClass}
            required
          />
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder={t("account.placeholder.lastNameRequired")}
            className={inputClass}
            required
          />
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            placeholder={t("account.placeholder.phone")}
            className={inputClass}
            inputMode="numeric"
            pattern="[0-9]*"
          />
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder={t("account.placeholder.countryRequired")}
            className={inputClass}
            required
          />
          <input
            type="text"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            placeholder={t("account.placeholder.addressLine1Required")}
            className={inputClass}
            required
          />
          <input
            type="text"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            placeholder={t("account.placeholder.addressLine2")}
            className={inputClass}
          />
          <input
            type="text"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            placeholder={t("account.placeholder.postcodeRequired")}
            className={inputClass}
            required
          />
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t("account.placeholder.cityRequired")}
            className={inputClass}
            required
          />
        </div>
        <div className="flex flex-col gap-2 text-sm text-gray-700 sm:flex-row sm:gap-6">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={isDefaultShipping}
              onChange={(e) => setIsDefaultShipping(e.target.checked)}
            />
            {t("account.defaultShipping")}
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={isDefaultBilling}
              onChange={(e) => setIsDefaultBilling(e.target.checked)}
            />
            {t("account.defaultBilling")}
          </label>
        </div>
        {error ? (
          <p className="text-sm font-medium text-red-700">{error}</p>
        ) : null}
        <div className="flex gap-3">
          <button
            type="submit"
            className={saveBtnClass}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? t("account.saving")
              : editingAddressId
                ? t("account.updateAddress")
                : t("account.saveAddress")}
          </button>
          {editingAddressId ? (
            <button
              type="button"
              className="px-6 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
              onClick={cancelEdit}
            >
              {t("account.cancel")}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

/* ─── Tab content: ORDERS ─────────────────────────────────── */
function statusColor(status: string) {
  const normalized = status.trim().toLowerCase();
  switch (normalized) {
    case "processing":
    case "in progress":
      return "text-yellow-600 bg-yellow-50";
    case "shipped":
      return "text-blue-600 bg-blue-50";
    case "completed":
    case "done":
      return "text-green-600 bg-green-50";
    case "new":
      return "text-my-red bg-red-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
}

function OrdersTab({
  t,
  orders,
  isLoading,
}: {
  t: (key: string) => string;
  orders: UserOrder[];
  isLoading: boolean;
}) {
  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  const statusLabel = (status: string) => {
    const normalized = status.trim().toLowerCase();
    if (normalized === "processing" || normalized === "in progress")
      return t("account.status.processing");
    if (normalized === "shipped") return t("account.status.shipped");
    if (normalized === "completed" || normalized === "done")
      return t("account.status.completed");
    return status.toUpperCase();
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className={sectionTitleClass}>{t("account.nav.orders")}</h2>
        <p className={sectionSubtitleClass}>{t("account.manageOrders")}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide px-5 pt-5 sm:px-6 sm:pt-6">
          {t("account.orderDetails")}
        </h3>

        {/* Table header */}
        <div className="grid grid-cols-3 gap-4 px-5 sm:px-6 pt-4 pb-2 border-b border-gray-200">
          <span className="text-xs font-bold text-gray-500 uppercase">
            {t("account.date")}
          </span>
          <span className="text-xs font-bold text-gray-500 uppercase">
            {t("account.orderNumber")}
          </span>
          <span className="text-xs font-bold text-gray-500 uppercase">
            {t("account.status")}
          </span>
        </div>

        {isLoading ? (
          <p className="px-5 py-4 text-sm text-gray-600 sm:px-6">
            {t("account.loadingOrders")}
          </p>
        ) : orders.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-600 sm:px-6">
            {t("account.noOrders")}
          </p>
        ) : (
          orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="grid grid-cols-3 gap-4 px-5 sm:px-6 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm text-gray-700">
                {formatDate(order.createdAt)}
              </span>
              <span className="text-sm text-gray-700 font-medium">
                {order.orderNumber}
              </span>
              <span>
                <span
                  className={`inline-block text-xs font-bold uppercase px-2.5 py-1 rounded-full ${statusColor(order.status)}`}
                >
                  {statusLabel(order.status)}
                </span>
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */
export default function AccountPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("account");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInEmail, setLoggedInEmail] = useState(
    isDevelopment ? siteEmails.devDemoCustomer : "",
  );
  const [accountProfile, setAccountProfile] = useState<UserProfile>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    companyName: "",
    vatNumber: "",
  });
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isAddressesLoading, setIsAddressesLoading] = useState(false);
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Clears all local sign-in state and notifies the header. Does NOT call the
  // backend logout endpoint (used both for manual sign-out and expired sessions).
  const clearLocalSession = useCallback(() => {
    clearCustomerAuthLocalState();
    setIsLoggedIn(false);
    setLoggedInEmail("");
    setAccountProfile({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      companyName: "",
      vatNumber: "",
    });
    setActiveTab("account");
    router.push("/account#account");
  }, [router]);

  // Called when an authenticated request returns 401: sign the user out locally
  // and surface the login view with an "expired session" notice.
  const handleSessionExpired = useCallback(() => {
    setSessionExpired(true);
    clearLocalSession();
  }, [clearLocalSession]);

  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    router.replace(`/account#${tab}`, { scroll: false });
  };

  useEffect(() => {
    const syncTabFromHash = () => {
      const tab = tabFromHash(window.location.hash);
      if (tab) {
        setActiveTab(tab);
      }
    };

    syncTabFromHash();
    window.addEventListener("hashchange", syncTabFromHash);
    return () => window.removeEventListener("hashchange", syncTabFromHash);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    const tab = tabFromHash(window.location.hash);
    if (tab) {
      setActiveTab(tab);
      return;
    }

    setActiveTab("account");
    router.replace("/account#account", { scroll: false });
  }, [isLoggedIn, router]);

  useEffect(() => {
    const storedStatus = localStorage.getItem(AUTH_STORAGE_KEY);
    const storedEmail = localStorage.getItem(AUTH_EMAIL_STORAGE_KEY);
    setIsLoggedIn(storedStatus === "true");
    if (storedEmail) {
      setLoggedInEmail(storedEmail);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !loggedInEmail) {
      return;
    }

    const backendBaseUrl = getBackendBaseUrl();
    const controller = new AbortController();

    const loadProfile = async () => {
      setIsProfileLoading(true);
      try {
        const response = await fetch(`${backendBaseUrl}/api/auth/profile`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (response.status === 401) {
          if (!controller.signal.aborted) handleSessionExpired();
          return;
        }
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: {
            firstName?: string;
            lastName?: string;
            phone?: string;
            email?: string;
            companyName?: string;
            vatNumber?: string;
          };
        };
        if (!response.ok || payload.ok !== true || !payload.data) {
          throw new Error(t("account.error.loadProfile"));
        }

        setAccountProfile({
          firstName: payload.data.firstName ?? "",
          lastName: payload.data.lastName ?? "",
          phone: payload.data.phone ?? "",
          email: payload.data.email ?? loggedInEmail,
          companyName: payload.data.companyName ?? "",
          vatNumber: payload.data.vatNumber ?? "",
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setAccountProfile({
          firstName: "",
          lastName: "",
          phone: "",
          email: loggedInEmail,
          companyName: "",
          vatNumber: "",
        });
      } finally {
        if (!controller.signal.aborted) {
          setIsProfileLoading(false);
        }
      }
    };

    void loadProfile();
    return () => controller.abort();
  }, [isLoggedIn, loggedInEmail, handleSessionExpired]);

  useEffect(() => {
    if (!isLoggedIn || !loggedInEmail) {
      setOrders([]);
      return;
    }

    const backendBaseUrl = getBackendBaseUrl();
    const controller = new AbortController();

    const loadOrders = async () => {
      setIsOrdersLoading(true);
      try {
        const response = await fetch(
          `${backendBaseUrl}/api/orders?email=${encodeURIComponent(loggedInEmail)}`,
          { credentials: "include", signal: controller.signal },
        );
        if (response.status === 401) {
          if (!controller.signal.aborted) handleSessionExpired();
          return;
        }
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: UserOrder[];
        };
        if (
          !response.ok ||
          payload.ok !== true ||
          !Array.isArray(payload.data)
        ) {
          throw new Error(t("account.error.loadOrders"));
        }
        setOrders(payload.data);
      } catch (_error) {
        if (controller.signal.aborted) return;
        setOrders([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsOrdersLoading(false);
        }
      }
    };

    void loadOrders();
    return () => controller.abort();
  }, [isLoggedIn, loggedInEmail, handleSessionExpired]);

  useEffect(() => {
    if (!isLoggedIn || !loggedInEmail) {
      setAddresses([]);
      return;
    }

    const backendBaseUrl = getBackendBaseUrl();
    const controller = new AbortController();

    const loadAddresses = async () => {
      setIsAddressesLoading(true);
      try {
        const response = await fetch(`${backendBaseUrl}/api/addresses`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (response.status === 401) {
          if (!controller.signal.aborted) handleSessionExpired();
          return;
        }
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: UserAddress[];
        };
        if (
          !response.ok ||
          payload.ok !== true ||
          !Array.isArray(payload.data)
        ) {
          throw new Error(t("account.error.loadAddresses"));
        }
        setAddresses(payload.data);
      } catch (_error) {
        if (controller.signal.aborted) return;
        setAddresses([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsAddressesLoading(false);
        }
      }
    };

    void loadAddresses();
    return () => controller.abort();
  }, [isLoggedIn, loggedInEmail, handleSessionExpired]);

  const saveProfile = async (payload: {
    firstName: string;
    lastName: string;
    phone: string;
    companyName: string;
    vatNumber: string;
  }) => {
    if (!loggedInEmail) {
      throw new Error(t("account.error.missingEmail"));
    }

    const response = await fetch(`${getBackendBaseUrl()}/api/auth/profile`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: loggedInEmail,
        ...payload,
      }),
    });
    if (response.status === 401) {
      handleSessionExpired();
      return;
    }
    const json = (await response.json()) as {
      ok?: boolean;
      message?: string;
      data?: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        email?: string;
        companyName?: string;
        vatNumber?: string;
      };
    };
    if (!response.ok || json.ok !== true || !json.data) {
      throw new Error(json.message ?? t("account.error.saveProfile"));
    }

    setAccountProfile({
      firstName: json.data.firstName ?? "",
      lastName: json.data.lastName ?? "",
      phone: json.data.phone ?? "",
      email: json.data.email ?? loggedInEmail,
      companyName: json.data.companyName ?? "",
      vatNumber: json.data.vatNumber ?? "",
    });
  };

  const createAddress = async (payload: {
    label: string;
    companyName: string;
    firstName: string;
    lastName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    postcode: string;
    city: string;
    country: string;
    isDefaultBilling: boolean;
    isDefaultShipping: boolean;
  }) => {
    if (!loggedInEmail) {
      throw new Error(t("account.error.missingEmail"));
    }

    const backendBaseUrl = getBackendBaseUrl();
    const response = await fetch(`${backendBaseUrl}/api/addresses`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: loggedInEmail,
        ...payload,
      }),
    });
    if (response.status === 401) {
      handleSessionExpired();
      return;
    }
    const json = (await response.json()) as { ok?: boolean; message?: string };
    if (!response.ok || json.ok !== true) {
      throw new Error(json.message ?? t("account.error.saveAddress"));
    }

    const reload = await fetch(`${backendBaseUrl}/api/addresses`, {
      credentials: "include",
    });
    const reloadJson = (await reload.json()) as {
      ok?: boolean;
      data?: UserAddress[];
    };
    if (reload.ok && reloadJson.ok === true && Array.isArray(reloadJson.data)) {
      setAddresses(reloadJson.data);
    }
  };

  const updateAddress = async (
    addressId: number,
    payload: {
      label: string;
      companyName: string;
      firstName: string;
      lastName: string;
      phone: string;
      addressLine1: string;
      addressLine2: string;
      postcode: string;
      city: string;
      country: string;
      isDefaultBilling: boolean;
      isDefaultShipping: boolean;
    },
  ) => {
    if (!loggedInEmail) {
      throw new Error(t("account.error.missingEmail"));
    }

    const backendBaseUrl = getBackendBaseUrl();
    const response = await fetch(
      `${backendBaseUrl}/api/addresses/${addressId}`,
      {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: loggedInEmail,
          ...payload,
        }),
      },
    );
    if (response.status === 401) {
      handleSessionExpired();
      return;
    }
    const json = (await response.json()) as { ok?: boolean; message?: string };
    if (!response.ok || json.ok !== true) {
      throw new Error(json.message ?? t("account.error.updateAddress"));
    }

    const reload = await fetch(`${backendBaseUrl}/api/addresses`, {
      credentials: "include",
    });
    const reloadJson = (await reload.json()) as {
      ok?: boolean;
      data?: UserAddress[];
    };
    if (reload.ok && reloadJson.ok === true && Array.isArray(reloadJson.data)) {
      setAddresses(reloadJson.data);
    }
  };

  const deleteAddress = async (addressId: number) => {
    if (!loggedInEmail) {
      throw new Error(t("account.error.missingEmail"));
    }

    const backendBaseUrl = getBackendBaseUrl();
    const response = await fetch(
      `${backendBaseUrl}/api/addresses/${addressId}`,
      { method: "DELETE", credentials: "include" },
    );
    if (response.status === 401) {
      handleSessionExpired();
      return;
    }
    const json = (await response.json()) as { ok?: boolean; message?: string };
    if (!response.ok || json.ok !== true) {
      throw new Error(json.message ?? t("account.error.deleteAddress"));
    }

    const reload = await fetch(`${backendBaseUrl}/api/addresses`, {
      credentials: "include",
    });
    const reloadJson = (await reload.json()) as {
      ok?: boolean;
      data?: UserAddress[];
    };
    if (reload.ok && reloadJson.ok === true && Array.isArray(reloadJson.data)) {
      setAddresses(reloadJson.data);
    }
  };

  const navItems: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "account",
      label: t("account.nav.account"),
      icon: <FaUser className="w-4 h-4" />,
    },
    {
      key: "address",
      label: t("account.nav.address"),
      icon: <FaMapMarkerAlt className="w-4 h-4" />,
    },
    {
      key: "orders",
      label: t("account.nav.orders"),
      icon: <FaBoxOpen className="w-4 h-4" />,
    },
  ];

  const titleMap: Record<Tab, string> = {
    account: t("account.title.account"),
    address: t("account.title.address"),
    orders: t("account.title.orders"),
  };

  return (
    <div>
      <B2b />

      {/* Breadcrumb */}
      <section className="w-full bg-white px-4 sm:px-6 lg:px-20 pt-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs lg:text-sm text-gray-500 uppercase tracking-wide">
            <Link href="/" className="hover:underline">
              {t("common.home")}
            </Link>
            <span className="mx-2">→</span>
            <span className="text-gray-700 font-semibold">
              {t("account.breadcrumb.accountManagement")}
            </span>
          </div>
          <Link
            href="/registration"
            className="text-sm text-my-red font-semibold hover:underline"
          >
            {t("account.newUserRegister")}
          </Link>
        </div>
      </section>

      {/* Red title bar */}
      <section className="w-full px-4 sm:px-6 lg:px-20 py-8">
        <div className="max-w-6xl mx-auto bg-my-red rounded-lg flex items-center justify-center gap-4 py-6 px-6">
          <FaUser className="w-10 h-10 sm:w-12 sm:h-12 text-white shrink-0" />
          <h1 className="text-white text-2xl sm:text-3xl lg:text-4xl font-bold uppercase tracking-wide">
            {titleMap[activeTab]}
          </h1>
        </div>
      </section>

      {/* Sidebar + Content */}
      <section className="w-full px-4 sm:px-6 lg:px-20 pb-12">
        {!isLoggedIn ? (
          <LoginRequiredView
            t={t}
            sessionExpired={sessionExpired}
            onLoginSuccess={(email) => {
              setSessionExpired(false);
              setLoggedInEmail(email);
              setIsLoggedIn(true);
            }}
          />
        ) : (
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">
            {/* ── Sidebar ── */}
            <aside className="lg:w-64 shrink-0">
              <nav className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                {navItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => selectTab(item.key)}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm font-bold uppercase tracking-wide transition-colors border-b border-gray-100 last:border-b-0 ${
                      activeTab === item.key
                        ? "bg-my-red text-white"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}

                {/* Divider */}
                <div className="border-t border-gray-200" />

                {/* Sign Out */}
                <button
                  type="button"
                  onClick={() => {
                    setSessionExpired(false);
                    void fetch(`${getBackendBaseUrl()}/api/auth/logout`, {
                      method: "POST",
                      credentials: "include",
                    })
                      .catch(() => {
                        // Keep local sign-out behavior even if backend is unavailable.
                      })
                      .finally(() => {
                        clearLocalSession();
                      });
                  }}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-bold uppercase tracking-wide text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100"
                >
                  <FaSignOutAlt className="w-4 h-4" />
                  {t("account.signOut")}
                </button>
              </nav>
            </aside>

            {/* ── Content ── */}
            <main className="flex-1 min-w-0">
              {activeTab === "account" && isProfileLoading ? (
                <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
                  {t("account.loadingDetails")}
                </div>
              ) : null}
              {activeTab === "account" && !isProfileLoading ? (
                <MyAccountTab
                  t={t}
                  profile={accountProfile}
                  onSaveProfile={saveProfile}
                />
              ) : null}
              {activeTab === "address" ? (
                <AddressTab
                  t={t}
                  addresses={addresses}
                  isLoading={isAddressesLoading}
                  onCreateAddress={createAddress}
                  onUpdateAddress={updateAddress}
                  onDeleteAddress={deleteAddress}
                />
              ) : null}
              {activeTab === "orders" ? (
                <OrdersTab t={t} orders={orders} isLoading={isOrdersLoading} />
              ) : null}
            </main>
          </div>
        )}
      </section>

      <ServicesSection />
      <HaveAQuestion />
      <NewsletterSubscribe />
    </div>
  );
}
