"use client";

import React, { useEffect, useState } from "react";
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
} from "react-icons/fa";

type Tab = "account" | "address" | "orders";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red";

const sectionTitleClass =
  "text-lg font-bold text-gray-900 mb-1";

const sectionSubtitleClass =
  "text-sm text-gray-500 mb-5";

const saveBtnClass =
  "px-6 py-2.5 rounded-lg bg-my-red text-white font-semibold text-sm hover:bg-my-red/90 transition-colors";

const AUTH_STORAGE_KEY = "boxmag.auth.loggedIn";
const AUTH_EMAIL_STORAGE_KEY = "boxmag.auth.email";
const isDevelopment = process.env.NODE_ENV === "development";

type UserProfile = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
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

function LoginRequiredView({
  t,
  onLoginSuccess,
}: {
  t: (key: string) => string;
  onLoginSuccess: (email: string) => void;
}) {
  const [email, setEmail] = useState(
    isDevelopment ? "yotrevorgxg@gmail.com" : "",
  );
  const [password, setPassword] = useState(isDevelopment ? "dummy123" : "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    localStorage.setItem(AUTH_STORAGE_KEY, "true");
    localStorage.setItem(AUTH_EMAIL_STORAGE_KEY, normalizedEmail);
    setError(null);
    onLoginSuccess(normalizedEmail);
  };

  return (
    <div className="mx-auto w-full max-w-xl rounded-lg border border-gray-200 bg-white p-6 sm:p-8">
      <h2 className="text-2xl font-bold text-gray-900">Sign in</h2>
      <p className="mt-2 text-sm text-gray-600">
        Sign in to access your account details, addresses, billing and orders.
      </p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="account-login-email" className="mb-1 block text-xs font-semibold uppercase text-gray-500">
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
          <label htmlFor="account-login-password" className="mb-1 block text-xs font-semibold uppercase text-gray-500">
            {t("account.password")}
          </label>
          <input
            id="account-login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="Password"
            required
          />
        </div>
        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
          <button type="submit" className={saveBtnClass}>
            Sign in
          </button>
          <Link href="/registration" className="text-sm font-semibold text-my-red hover:underline">
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
}: {
  t: (key: string) => string;
  profile: UserProfile;
}) {
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone);
  const [emailAddress, setEmailAddress] = useState(profile.email);

  useEffect(() => {
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setPhone(profile.phone);
    setEmailAddress(profile.email);
  }, [profile]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className={sectionTitleClass}>{t("account.nav.account")}</h2>
        <p className={sectionSubtitleClass}>{t("account.manageSettings")}</p>
      </div>

      {/* Name */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{t("account.nameSection")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="acc-first" className="block text-xs font-semibold text-gray-500 mb-1 uppercase">{t("account.yourName")}</label>
            <input id="acc-first" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t("account.yourName")} className={inputClass} />
          </div>
          <div>
            <label htmlFor="acc-last" className="block text-xs font-semibold text-gray-500 mb-1 uppercase">{t("account.yourName")}</label>
            <input id="acc-last" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={t("account.yourName")} className={inputClass} />
          </div>
        </div>
        <button type="button" className={saveBtnClass}>{t("account.save")}</button>
      </div>

      {/* Contact */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{t("account.contactSection")}</h3>
        <div>
          <label htmlFor="acc-phone" className="block text-xs font-semibold text-gray-500 mb-1 uppercase">{t("account.phone")}</label>
          <div className="flex gap-2">
            <span className="shrink-0 flex items-center px-3 rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-600 font-medium">RO +40</span>
            <input id="acc-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="123 456 789" className={inputClass} />
          </div>
        </div>
        <button type="button" className={saveBtnClass}>{t("account.save")}</button>
      </div>

      {/* Email */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{t("account.emailSection")}</h3>
        <div>
          <label htmlFor="acc-email" className="block text-xs font-semibold text-gray-500 mb-1 uppercase">{t("account.emailAddress")}</label>
          <input id="acc-email" type="email" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder="You@yourwebsite.com" className={inputClass} />
        </div>
        <button type="button" className={saveBtnClass}>{t("account.save")}</button>
      </div>
    </div>
  );
}

/* ─── Tab content: ADDRESS ────────────────────────────────── */
function AddressTab({
  t,
  addresses,
  isLoading,
  onCreateAddress,
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
  const [isDefaultBilling, setIsDefaultBilling] = useState(false);
  const [isDefaultShipping, setIsDefaultShipping] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setIsDefaultBilling(false);
      setIsDefaultShipping(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Failed to save address",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className={sectionTitleClass}>{t("account.nav.address")}</h2>
        <p className={sectionSubtitleClass}>{t("account.manageShippingAddress")}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
          Saved addresses
        </h3>
        {isLoading ? (
          <p className="text-sm text-gray-600">Loading addresses...</p>
        ) : addresses.length === 0 ? (
          <p className="text-sm text-gray-600">No saved addresses yet.</p>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <div key={address.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <FaMapMarkerAlt className="mt-0.5 h-4 w-4 shrink-0 text-my-red" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-gray-800">
                      {[address.firstName, address.lastName].filter(Boolean).join(" ")}
                    </p>
                    {address.companyName ? <p>{address.companyName}</p> : null}
                    {address.label ? (
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        {address.label}
                      </p>
                    ) : null}
                    <p>{address.addressLine1}</p>
                    {address.addressLine2 ? <p>{address.addressLine2}</p> : null}
                    <p>
                      {address.postcode} {address.city}
                    </p>
                    <p>{address.country}</p>
                    {address.phone ? <p>Tel: {address.phone}</p> : null}
                    <p className="text-xs text-gray-500">
                      {address.isDefaultShipping ? "Default shipping" : ""}
                      {address.isDefaultShipping && address.isDefaultBilling ? " • " : ""}
                      {address.isDefaultBilling ? "Default billing" : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6 space-y-4"
      >
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
          Add new address
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (Home, Warehouse...)"
            className={inputClass}
          />
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Company Name"
            className={inputClass}
          />
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First Name *"
            className={inputClass}
            required
          />
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last Name *"
            className={inputClass}
            required
          />
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            className={inputClass}
          />
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Country *"
            className={inputClass}
            required
          />
          <input
            type="text"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            placeholder="Address line 1 *"
            className={inputClass}
            required
          />
          <input
            type="text"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            placeholder="Address line 2"
            className={inputClass}
          />
          <input
            type="text"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            placeholder="Postcode *"
            className={inputClass}
            required
          />
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City *"
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
            Default shipping
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={isDefaultBilling}
              onChange={(e) => setIsDefaultBilling(e.target.checked)}
            />
            Default billing
          </label>
        </div>
        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        <button type="submit" className={saveBtnClass} disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save address"}
        </button>
      </form>
    </div>
  );
}

/* ─── Tab content: ORDERS ─────────────────────────────────── */
const sampleOrders = [
  { date: "16-Apr-2024", orderNumber: "12912312", status: "PROCESSING" },
  { date: "12-Apr-2024", orderNumber: "12912280", status: "PROCESSING" },
  { date: "10-Apr-2024", orderNumber: "12912240", status: "PROCESSING" },
  { date: "07-Apr-2024", orderNumber: "12912199", status: "SHIPPED" },
  { date: "04-Feb-2024", orderNumber: "12912140", status: "COMPLETED" },
  { date: "01-Jan-2024", orderNumber: "12912101", status: "COMPLETED" },
];

function statusColor(status: string) {
  switch (status) {
    case "PROCESSING":
      return "text-yellow-600 bg-yellow-50";
    case "SHIPPED":
      return "text-blue-600 bg-blue-50";
    case "COMPLETED":
      return "text-green-600 bg-green-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
}

function OrdersTab({ t }: { t: (key: string) => string }) {
  const statusLabel = (status: string) => {
    if (status === "PROCESSING") return t("account.status.processing");
    if (status === "SHIPPED") return t("account.status.shipped");
    if (status === "COMPLETED") return t("account.status.completed");
    return status;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className={sectionTitleClass}>{t("account.nav.orders")}</h2>
        <p className={sectionSubtitleClass}>{t("account.manageOrders")}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide px-5 pt-5 sm:px-6 sm:pt-6">{t("account.orderDetails")}</h3>

        {/* Table header */}
        <div className="grid grid-cols-3 gap-4 px-5 sm:px-6 pt-4 pb-2 border-b border-gray-200">
          <span className="text-xs font-bold text-gray-500 uppercase">{t("account.date")}</span>
          <span className="text-xs font-bold text-gray-500 uppercase">{t("account.orderNumber")}</span>
          <span className="text-xs font-bold text-gray-500 uppercase">{t("account.status")}</span>
        </div>

        {/* Rows */}
        {sampleOrders.map((order) => (
          <div
            key={order.orderNumber}
            className="grid grid-cols-3 gap-4 px-5 sm:px-6 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm text-gray-700">{order.date}</span>
            <span className="text-sm text-gray-700 font-medium">{order.orderNumber}</span>
            <span>
              <span className={`inline-block text-xs font-bold uppercase px-2.5 py-1 rounded-full ${statusColor(order.status)}`}>
                {statusLabel(order.status)}
              </span>
            </span>
          </div>
        ))}
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
    isDevelopment ? "yotrevorgxg@gmail.com" : "",
  );
  const [accountProfile, setAccountProfile] = useState<UserProfile>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isAddressesLoading, setIsAddressesLoading] = useState(false);

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

    const backendBaseUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL?.trim()?.replace(/\/$/, "") ??
      "http://localhost:3005";
    const controller = new AbortController();

    const loadProfile = async () => {
      setIsProfileLoading(true);
      try {
        const response = await fetch(
          `${backendBaseUrl}/api/auth/profile?email=${encodeURIComponent(loggedInEmail)}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: {
            firstName?: string;
            lastName?: string;
            phone?: string;
            email?: string;
          };
        };
        if (!response.ok || payload.ok !== true || !payload.data) {
          throw new Error("Failed to load profile");
        }

        setAccountProfile({
          firstName: payload.data.firstName ?? "",
          lastName: payload.data.lastName ?? "",
          phone: payload.data.phone ?? "",
          email: payload.data.email ?? loggedInEmail,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setAccountProfile({
          firstName: "",
          lastName: "",
          phone: "",
          email: loggedInEmail,
        });
      } finally {
        if (!controller.signal.aborted) {
          setIsProfileLoading(false);
        }
      }
    };

    void loadProfile();
    return () => controller.abort();
  }, [isLoggedIn, loggedInEmail]);

  useEffect(() => {
    if (!isLoggedIn || !loggedInEmail) {
      setAddresses([]);
      return;
    }

    const backendBaseUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL?.trim()?.replace(/\/$/, "") ??
      "http://localhost:3005";
    const controller = new AbortController();

    const loadAddresses = async () => {
      setIsAddressesLoading(true);
      try {
        const response = await fetch(
          `${backendBaseUrl}/api/addresses?email=${encodeURIComponent(loggedInEmail)}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: UserAddress[];
        };
        if (!response.ok || payload.ok !== true || !Array.isArray(payload.data)) {
          throw new Error("Failed to load addresses");
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
  }, [isLoggedIn, loggedInEmail]);

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
      throw new Error("Missing account email.");
    }

    const backendBaseUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL?.trim()?.replace(/\/$/, "") ??
      "http://localhost:3005";
    const response = await fetch(`${backendBaseUrl}/api/addresses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: loggedInEmail,
        ...payload,
      }),
    });
    const json = (await response.json()) as { ok?: boolean; message?: string };
    if (!response.ok || json.ok !== true) {
      throw new Error(json.message ?? "Failed to save address");
    }

    const reload = await fetch(
      `${backendBaseUrl}/api/addresses?email=${encodeURIComponent(loggedInEmail)}`,
    );
    const reloadJson = (await reload.json()) as { ok?: boolean; data?: UserAddress[] };
    if (reload.ok && reloadJson.ok === true && Array.isArray(reloadJson.data)) {
      setAddresses(reloadJson.data);
    }
  };

  
  const navItems: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "account", label: t("account.nav.account"), icon: <FaUser className="w-4 h-4" /> },
    { key: "address", label: t("account.nav.address"), icon: <FaMapMarkerAlt className="w-4 h-4" /> },
    { key: "orders", label: t("account.nav.orders"), icon: <FaBoxOpen className="w-4 h-4" /> },
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
            <Link href="/" className="hover:underline">Home</Link>
            <span className="mx-2">→</span>
            <span className="text-gray-700 font-semibold">{t("account.breadcrumb.accountManagement")}</span>
          </div>
          <Link href="/registration" className="text-sm text-my-red font-semibold hover:underline">
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
            onLoginSuccess={(email) => {
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
                    onClick={() => setActiveTab(item.key)}
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
                    localStorage.removeItem(AUTH_STORAGE_KEY);
                    localStorage.removeItem(AUTH_EMAIL_STORAGE_KEY);
                    setIsLoggedIn(false);
                    setLoggedInEmail("");
                    setAccountProfile({
                      firstName: "",
                      lastName: "",
                      phone: "",
                      email: "",
                    });
                    setActiveTab("account");
                    router.push("/account");
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
                  Loading account details...
                </div>
              ) : null}
              {activeTab === "account" && !isProfileLoading ? (
                <MyAccountTab t={t} profile={accountProfile} />
              ) : null}
              {activeTab === "address" ? (
                <AddressTab
                  t={t}
                  addresses={addresses}
                  isLoading={isAddressesLoading}
                  onCreateAddress={createAddress}
                />
              ) : null}
              {activeTab === "orders" && <OrdersTab t={t} />}
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
