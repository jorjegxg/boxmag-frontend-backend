"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaArrowLeft } from "react-icons/fa";
import { B2b } from "../global/components/b2b";
import ResponsiveLayoutWithPadding from "../ResponsiveLayoutWithPadding";
import { ServicesSection } from "../global/components/services-section";
import { HaveAQuestion } from "../global/components/have-a-question";
import { NewsletterSubscribe } from "../global/components/newsletter-subscribe";
import { useLanguage } from "../i18n/language-context";
import { useCartStore } from "../stores/cart_store";

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

const AUTH_EMAIL_STORAGE_KEY = "boxmag.auth.email";

export default function CheckoutPage() {
  const { t } = useLanguage();
  const [addressType, setAddressType] = useState<"company" | "another">("company");
  const [shippingMethod, setShippingMethod] = useState<"standard" | "express">("standard");
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const cartItems = useCartStore((s) => s.items);
  const cartSubtotal = useCartStore((s) => s.subtotal);
  const backendBaseUrl = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
    if (!value) return "http://localhost:3005";
    return value.endsWith("/") ? value.slice(0, -1) : value;
  }, []);

  useEffect(() => {
    const loggedInEmail = localStorage.getItem(AUTH_EMAIL_STORAGE_KEY) ?? "";
    if (!loggedInEmail) {
      setAddresses([]);
      setSelectedAddressId(null);
      return;
    }

    const controller = new AbortController();
    const loadAddresses = async () => {
      setIsLoadingAddresses(true);
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
        const defaultAddress =
          payload.data.find((address) => address.isDefaultShipping) ??
          payload.data[0] ??
          null;
        setSelectedAddressId(defaultAddress?.id ?? null);
      } catch (_error) {
        if (controller.signal.aborted) return;
        setAddresses([]);
        setSelectedAddressId(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingAddresses(false);
        }
      }
    };

    void loadAddresses();
    return () => controller.abort();
  }, [backendBaseUrl]);

  const selectedAddress =
    addresses.find((address) => address.id === selectedAddressId) ?? null;

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
          <span className="text-gray-700 font-semibold">{t("checkout.breadcrumb.checkout")}</span>
        </div>
      </section>

      <div className="pt-8 md:pt-12 lg:pt-16" />
      <ResponsiveLayoutWithPadding>
        {/* Order Summary bar */}
        <OrderSummary />
        <BottomPadding />
        {/* Shopping Cart Header */}
        {CartHeader()}
        <BottomPadding />
        <ProductDetails />
        <BottomPadding />
        <ShippingInformation
          addressType={addressType}
          setAddressType={setAddressType}
          addresses={addresses}
          isLoadingAddresses={isLoadingAddresses}
          selectedAddressId={selectedAddressId}
          setSelectedAddressId={setSelectedAddressId}
          selectedAddress={selectedAddress}
        />
        <BottomPadding />
        <ShippingMethod shippingMethod={shippingMethod} setShippingMethod={setShippingMethod} />
        <BottomPadding />
        <hr className="border-gray-200" />
        <BottomPadding />
        {/* Checkout Summary Bar */}
        <CheckoutSummaryBar
          subtotal={cartSubtotal}
          vatPercent={19}
          shipping={shippingMethod === "express" ? 40.0 : 25.0}
          currency="€"
          onContinueHref="/boxesfetco"
        />
        <BottomPadding />
      </ResponsiveLayoutWithPadding>

      <ServicesSection />
      <HaveAQuestion />
      <NewsletterSubscribe />
    </div>
  );

  function money(value: number, currency: string) {
    return `${currency} ${value.toFixed(2)}`;
  }

  function CheckoutSummaryBar({
    subtotal,
    vatPercent,
    shipping,
    currency = "€",
    onContinueHref = "/boxesfetco",
  }: {
    subtotal: number;
    vatPercent: number;
    shipping: number;
    currency?: string;
    onContinueHref?: string;
  }) {
    const vat = +(subtotal * (vatPercent / 100)).toFixed(2);
    const total = +(subtotal + vat + shipping).toFixed(2);

    return (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          <Link
            href={onContinueHref}
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-wide group order-2 sm:order-1"
          >
            <span className="text-my-red transition-transform group-hover:-translate-x-0.5">
              <FaArrowLeft />
            </span>
            <span className="uppercase">{t("checkout.continueShopping")}</span>
          </Link>

          <div className="ml-0 sm:ml-auto flex flex-col items-start sm:items-end order-1 sm:order-2">
            <div className="grid grid-cols-[1fr_auto] gap-x-8 gap-y-2 text-sm text-right w-full sm:w-auto">
              <div className="font-semibold tracking-wide">{t("checkout.subtotal")}</div>
              <div className="text-my-gray">{money(subtotal, currency)}</div>
              <div className="font-semibold tracking-wide">
                {t("checkout.vatTax")} ({vatPercent}%)
              </div>
              <div className="text-my-gray">{money(vat, currency)}</div>
              <div className="font-semibold tracking-wide">{t("checkout.shipping")}</div>
              <div className="text-my-gray">{money(shipping, currency)}</div>
            </div>
            <div className="mt-6">
              <div className="inline-flex items-center gap-2 rounded-full border-2 border-my-red px-6 py-3">
                <span className="text-sm font-semibold uppercase tracking-wide text-my-red">
                  {t("checkout.total")}
                </span>
                <span className="text-base font-bold">
                  {money(total, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function ProductDetails() {
    if (cartItems.length === 0) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
          Cart is empty.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {cartItems.map((item) => (
          <div
            key={item.itemNo}
            className="flex flex-col sm:flex-row flex-wrap gap-6 text-sm justify-between rounded-lg border border-gray-200 p-4"
          >
            <Image
              src={item.imageUrl || "/placeholders/box.png"}
              alt={item.name}
              width={100}
              height={100}
              className="object-contain shrink-0"
            />
            <MyColumn
              name1={t("checkout.product.itemNo")}
              value1={item.itemNo}
              name2={t("checkout.product.productName")}
              value2={item.name}
            />
            <MyColumn
              name1={t("checkout.product.amountQty")}
              value1={String(item.quantity)}
              name2={t("checkout.product.palletPcs")}
              value2="-"
            />
            <MyColumn
              name1={t("checkout.product.netWeight")}
              value1="-"
              name2={t("checkout.product.priceWithoutTax")}
              value2={`€ ${(item.unitPrice * item.quantity).toFixed(2)}`}
            />
          </div>
        ))}
      </div>
    );
  }

  function CartHeader() {
    return (
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl">{t("checkout.shoppingCart")}</span>
          <span className="bg-my-red rounded-full w-6 h-6 flex items-center justify-center text-white text-sm font-semibold">
            {cartItems.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <GrayText text={t("checkout.orderType")} />
          <GrayText text="B2B" />
        </div>
      </div>
    );
  }

  function BottomPadding({ className = "pb-10" }: { className?: string }) {
    return <div className={className} />;
  }

  function MyColumn({
    name1,
    value1,
    name2,
    value2,
  }: {
    name1: string;
    value1: string;
    name2: string;
    value2: string;
  }) {
    return (
      <div className="flex flex-col justify-center">
        <div className="flex gap-2">
          <span className="font-bold">{name1}</span>
          <span className="text-my-gray">{value1}</span>
        </div>
        <div className="mt-2 flex gap-2">
          <span className="font-bold">{name2}</span>
          <span className="text-my-gray">{value2}</span>
        </div>
      </div>
    );
  }

  function GrayText({ text }: { text: string }) {
    return <span className="text-my-gray font-bold text-sm">{text}</span>;
  }

  function OrderSummary() {
    return (
      <div className="bg-my-red w-full px-6 py-3 sm:px-8 sm:py-4 rounded-t-lg">
        <h2 className="font-bold text-white text-base sm:text-lg">
          {t("checkout.orderSummary")}
        </h2>
      </div>
    );
  }

  function ShippingInformation({
    addressType,
    setAddressType,
    addresses,
    isLoadingAddresses,
    selectedAddressId,
    setSelectedAddressId,
    selectedAddress,
  }: {
    addressType: "company" | "another";
    setAddressType: (v: "company" | "another") => void;
    addresses: UserAddress[];
    isLoadingAddresses: boolean;
    selectedAddressId: number | null;
    setSelectedAddressId: (value: number | null) => void;
    selectedAddress: UserAddress | null;
  }) {
    return (
      <div className="w-full">
        <h2 className="font-bold text-black text-base sm:text-lg mb-4 uppercase tracking-wide">
          {t("checkout.shippingInfo")}
        </h2>
        <div className="rounded-lg border-2 border-gray-200 bg-white overflow-hidden">
          <div className="flex flex-col sm:flex-row min-h-[160px]">
            <div className="flex-1 p-6 flex flex-col justify-center">
              {isLoadingAddresses ? (
                <p className="text-sm text-gray-600">Loading your addresses...</p>
              ) : !selectedAddress ? (
                <>
                  <p className="font-bold text-black">No address selected</p>
                  <p className="text-gray-600 text-sm mt-1">
                    Add an address in your account and select it here.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-black">
                    {[selectedAddress.firstName, selectedAddress.lastName]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                  {selectedAddress.companyName ? (
                    <p className="text-gray-600 text-sm mt-1">{selectedAddress.companyName}</p>
                  ) : null}
                  <p className="text-gray-600 text-sm mt-1">{selectedAddress.addressLine1}</p>
                  {selectedAddress.addressLine2 ? (
                    <p className="text-gray-600 text-sm">{selectedAddress.addressLine2}</p>
                  ) : null}
                  <p className="text-gray-600 text-sm">
                    {selectedAddress.postcode} {selectedAddress.city}
                  </p>
                  <p className="text-gray-600 text-sm">{selectedAddress.country}</p>
                  {selectedAddress.phone ? (
                    <p className="text-gray-600 text-sm mt-2">
                      Tel: {selectedAddress.phone}
                    </p>
                  ) : null}
                </>
              )}
            </div>
            <div className="sm:w-64 h-40 sm:h-auto sm:min-h-[160px] bg-gray-200 shrink-0 flex items-center justify-center text-gray-500 text-sm">
              {t("checkout.map")}
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-my-red font-semibold text-sm flex items-center gap-2">
            <span>•</span> {t("checkout.selectAddress")}
          </p>
          {addresses.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {addresses.map((address) => (
                <button
                  key={address.id}
                  type="button"
                  onClick={() => setSelectedAddressId(address.id)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    selectedAddressId === address.id
                      ? "border-my-red bg-red-50 text-my-red"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  <p className="font-semibold">
                    {address.label || `${address.firstName} ${address.lastName}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {address.city}, {address.country}
                  </p>
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setAddressType("company");
                const btn = e.currentTarget as HTMLButtonElement;
                requestAnimationFrame(() => btn.blur());
              }}
              className={`px-4 py-2 rounded-lg border-2 font-semibold text-sm transition-colors ${
                addressType === "company"
                  ? "border-my-red text-my-red bg-white"
                  : "border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
            >
              {t("checkout.companyAddress")}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setAddressType("another");
                const btn = e.currentTarget as HTMLButtonElement;
                requestAnimationFrame(() => btn.blur());
              }}
              className={`px-4 py-2 rounded-lg border-2 font-semibold text-sm transition-colors ${
                addressType === "another"
                  ? "border-my-red text-my-red bg-white"
                  : "border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
            >
              {t("checkout.anotherAddress")}
            </button>
          </div>
          <p className="text-my-red font-semibold text-sm flex items-center gap-2 mt-3">
            <span>•</span>{" "}
            <Link href="/account" className="hover:underline">
              {t("checkout.manageAccount")}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  function ShippingMethod({
    shippingMethod,
    setShippingMethod,
  }: {
    shippingMethod: "standard" | "express";
    setShippingMethod: (v: "standard" | "express") => void;
  }) {
    return (
      <div className="w-full">
        <h2 className="font-bold text-black text-base sm:text-lg mb-4 uppercase tracking-wide">
          {t("checkout.shippingMethod")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const scrollY = window.scrollY;
              setShippingMethod("standard");
              const btn = e.currentTarget as HTMLButtonElement;
              btn.blur();
              requestAnimationFrame(() => window.scrollTo(0, scrollY));
            }}
            className={`flex items-start gap-4 p-5 rounded-lg border-2 text-left transition-colors ${
              shippingMethod === "standard"
                ? "border-my-red bg-white"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <span className={`shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${shippingMethod === "standard" ? "border-my-red" : "border-gray-300"}`}>
              {shippingMethod === "standard" && (
                <span className="h-2.5 w-2.5 rounded-full bg-my-red" />
              )}
            </span>
            <div>
              <p className="font-bold text-black">{t("checkout.standardDelivery")}</p>
              <p className="text-gray-500 text-sm mt-0.5">{t("checkout.standardEta")}</p>
              <p className="font-bold text-black mt-2">USD 25$</p>
            </div>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const scrollY = window.scrollY;
              setShippingMethod("express");
              const btn = e.currentTarget as HTMLButtonElement;
              btn.blur();
              requestAnimationFrame(() => window.scrollTo(0, scrollY));
            }}
            className={`flex items-start gap-4 p-5 rounded-lg border-2 text-left transition-colors ${
              shippingMethod === "express"
                ? "border-my-red bg-white"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <span className={`shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${shippingMethod === "express" ? "border-my-red" : "border-gray-300"}`}>
              {shippingMethod === "express" && (
                <span className="h-2.5 w-2.5 rounded-full bg-my-red" />
              )}
            </span>
            <div>
              <p className="font-bold text-black">{t("checkout.expressDelivery")}</p>
              <p className="text-gray-500 text-sm mt-0.5">{t("checkout.expressEta")}</p>
              <p className="font-bold text-black mt-2">USD 40$</p>
            </div>
          </button>
        </div>
      </div>
    );
  }
}
