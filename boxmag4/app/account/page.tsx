"use client";

import React, { useState } from "react";
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
  FaCreditCard,
  FaBoxOpen,
  FaSignOutAlt,
  FaTrashAlt,
} from "react-icons/fa";

type Tab = "account" | "address" | "billing" | "orders";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red";

const sectionTitleClass =
  "text-lg font-bold text-gray-900 mb-1";

const sectionSubtitleClass =
  "text-sm text-gray-500 mb-5";

const saveBtnClass =
  "px-6 py-2.5 rounded-lg bg-my-red text-white font-semibold text-sm hover:bg-my-red/90 transition-colors";

/* ─── Tab content: MY ACCOUNT ─────────────────────────────── */
function MyAccountTab({ t }: { t: (key: string) => string }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("**************");

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="acc-email" className="block text-xs font-semibold text-gray-500 mb-1 uppercase">{t("account.emailAddress")}</label>
            <input id="acc-email" type="email" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder="You@yourwebsite.com" className={inputClass} />
          </div>
          <div>
            <label htmlFor="acc-pass" className="block text-xs font-semibold text-gray-500 mb-1 uppercase">{t("account.password")}</label>
            <input id="acc-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
          </div>
        </div>
        <button type="button" className={saveBtnClass}>{t("account.save")}</button>
      </div>
    </div>
  );
}

/* ─── Tab content: ADDRESS ────────────────────────────────── */
function AddressTab({ t }: { t: (key: string) => string }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className={sectionTitleClass}>{t("account.nav.address")}</h2>
        <p className={sectionSubtitleClass}>{t("account.manageShippingAddress")}</p>
      </div>

      {/* Company Address */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6 space-y-3">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{t("account.companyAddress")}</h3>
        <div className="flex items-start gap-3 text-sm text-gray-600">
          <FaMapMarkerAlt className="w-4 h-4 text-my-red shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-gray-800">Jhon Smith</p>
            <p>Strada Mircea Cel Batran</p>
            <p>Alexandria</p>
            <p>Romania</p>
            <p>Tel: XXXX XXX 558</p>
          </div>
        </div>
        <button type="button" className={saveBtnClass}>{t("account.save")}</button>
      </div>

      {/* Another Address */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6 space-y-3">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{t("account.anotherAddress")}</h3>
        <div className="flex items-start gap-3 text-sm text-gray-600">
          <FaMapMarkerAlt className="w-4 h-4 text-my-red shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-gray-800">Jhon Smith</p>
            <p>Strada Mircea Cel Batran</p>
            <p>Alexandria</p>
            <p>Romania</p>
            <p>Tel: XXXX XXX 558</p>
          </div>
        </div>
        <button type="button" className={saveBtnClass}>{t("account.save")}</button>
      </div>
    </div>
  );
}

/* ─── Tab content: BILLING ────────────────────────────────── */
function BillingTab({ t }: { t: (key: string) => string }) {
  const [paymentType, setPaymentType] = useState<"credit" | "paypal" | "bank">("credit");
  const [nameOnCard, setNameOnCard] = useState("Jhon Smith");
  const [cardNumber, setCardNumber] = useState("**** **** **** 8758");
  const [expMonth, setExpMonth] = useState("02");
  const [expYear, setExpYear] = useState("2027");
  const [cvv, setCvv] = useState("123");

  const paymentOptions: { key: typeof paymentType; label: string }[] = [
    { key: "credit", label: t("account.payment.creditCard") },
    { key: "paypal", label: t("account.payment.paypal") },
    { key: "bank", label: t("account.payment.bankTransfer") },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className={sectionTitleClass}>{t("account.nav.billing")}</h2>
        <p className={sectionSubtitleClass}>{t("account.billingManageInfo")}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6 space-y-5">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{t("account.cardDetails")}</h3>

        {/* Payment type selector */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{t("account.paymentType")}</p>
          <div className="flex flex-wrap gap-3">
            {paymentOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPaymentType(opt.key)}
                className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                  paymentType === opt.key
                    ? "border-my-red bg-my-red text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:border-my-red hover:text-my-red"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {paymentType === "credit" && (
          <div className="space-y-4">
            <div>
              <label htmlFor="bill-name" className="block text-xs font-semibold text-gray-500 mb-1 uppercase">{t("account.nameOnCard")}</label>
              <input id="bill-name" type="text" value={nameOnCard} onChange={(e) => setNameOnCard(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="bill-card" className="block text-xs font-semibold text-gray-500 mb-1 uppercase">{t("account.cardNumber")}</label>
              <input id="bill-card" type="text" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="bill-month" className="block text-xs font-semibold text-gray-500 mb-1 uppercase">{t("account.expirationDate")}</label>
                <div className="flex gap-2">
                  <input id="bill-month" type="text" value={expMonth} onChange={(e) => setExpMonth(e.target.value)} placeholder="MM" className={inputClass} maxLength={2} />
                  <input type="text" value={expYear} onChange={(e) => setExpYear(e.target.value)} placeholder="YYYY" className={inputClass} maxLength={4} />
                </div>
              </div>
              <div>
                <label htmlFor="bill-cvv" className="block text-xs font-semibold text-gray-500 mb-1 uppercase">{t("account.cvv")}</label>
                <input id="bill-cvv" type="text" value={cvv} onChange={(e) => setCvv(e.target.value)} placeholder="CVV" className={inputClass} maxLength={4} />
              </div>
            </div>
          </div>
        )}

        {paymentType === "paypal" && (
          <p className="text-sm text-gray-600">{t("account.paypalHint")}</p>
        )}

        {paymentType === "bank" && (
          <p className="text-sm text-gray-600">{t("account.bankHint")}</p>
        )}

        <button type="button" className={saveBtnClass}>{t("account.saveCard")}</button>
      </div>
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

  const navItems: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "account", label: t("account.nav.account"), icon: <FaUser className="w-4 h-4" /> },
    { key: "address", label: t("account.nav.address"), icon: <FaMapMarkerAlt className="w-4 h-4" /> },
    { key: "billing", label: t("account.nav.billing"), icon: <FaCreditCard className="w-4 h-4" /> },
    { key: "orders", label: t("account.nav.orders"), icon: <FaBoxOpen className="w-4 h-4" /> },
  ];

  const titleMap: Record<Tab, string> = {
    account: t("account.title.account"),
    address: t("account.title.address"),
    billing: t("account.title.billing"),
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
                onClick={() => router.push("/")}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-bold uppercase tracking-wide text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100"
              >
                <FaSignOutAlt className="w-4 h-4" />
                {t("account.signOut")}
              </button>

              {/* Delete Account */}
              <button
                type="button"
                className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-bold uppercase tracking-wide text-red-500 hover:bg-red-50 transition-colors"
              >
                <FaTrashAlt className="w-4 h-4" />
                {t("account.deleteAccount")}
              </button>
            </nav>
          </aside>

          {/* ── Content ── */}
          <main className="flex-1 min-w-0">
            {activeTab === "account" && <MyAccountTab t={t} />}
            {activeTab === "address" && <AddressTab t={t} />}
            {activeTab === "billing" && <BillingTab t={t} />}
            {activeTab === "orders" && <OrdersTab t={t} />}
          </main>
        </div>
      </section>

      <ServicesSection />
      <HaveAQuestion />
      <NewsletterSubscribe />
    </div>
  );
}
