"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaArrowLeft } from "react-icons/fa";
import { B2b } from "../global/components/b2b";
import ResponsiveLayoutWithPadding from "../ResponsiveLayoutWithPadding";
import { ServicesSection } from "../global/components/services-section";
import { HaveAQuestion } from "../global/components/have-a-question";
import { NewsletterSubscribe } from "../global/components/newsletter-subscribe";
import { useLanguage } from "../i18n/language-context";
import { useCurrency } from "../currency/currency-context";
import { useCartStore, type CartItem } from "../stores/cart_store";
import { MIN_ORDER_QTY } from "../constants/order";
import { FaTrashAlt } from "react-icons/fa";
import { isDevelopmentAppEnv } from "../../lib/app-env";
import { rememberVatCompany } from "../../lib/vat-company";
import { CheckoutShippingInformation } from "./components/checkout-shipping-information";

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

type ManualAddress = {
  firstName: string;
  lastName: string;
  companyName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  postcode: string;
  city: string;
  country: string;
};

const AUTH_EMAIL_STORAGE_KEY = "boxmag.auth.email";
const GUEST_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SHIPPING_METHODS_CACHE_KEY = "boxmag.checkout.shippingMethods.v2";
const SHIPPING_METHODS_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const CART_QTY_STEP = 10;
const MAX_ATTACHMENT_MB = 18;
const MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_MB * 1024 * 1024;
const VAT_NUMBER_REGEX = /^([A-Z]{2})?[A-Z0-9]{2,12}$/i;
const shouldAutofillCheckout = isDevelopmentAppEnv();

function normalizeVatNumber(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

type ShippingMethodOption = {
  id: number;
  key: string;
  name: string;
  etaText: string;
  price: number;
  isActive: boolean;
  sortOrder: number;
};

const FALLBACK_SHIPPING_METHODS: ShippingMethodOption[] = [
  {
    id: 0,
    key: "own-transport",
    name: "Own transport",
    etaText: "Customer pickup / own carrier",
    price: 0,
    isActive: true,
    sortOrder: 0,
  },
  {
    id: 1,
    key: "standard",
    name: "Standard Delivery",
    etaText: "Estimated 7-10 days",
    price: 25,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 2,
    key: "express",
    name: "Express Delivery",
    etaText: "Estimated 2-4 days",
    price: 40,
    isActive: true,
    sortOrder: 2,
  },
];

function getShippingMethodDisplay(
  method: ShippingMethodOption,
  t: (key: string) => string,
): { name: string; etaText: string } {
  if (method.key === "own-transport") {
    return {
      name: t("checkout.shipping.ownTransport"),
      etaText: t("checkout.shipping.ownTransportEta"),
    };
  }
  return { name: method.name, etaText: method.etaText };
}

function isDpdCarrierMethod(methodKey: string): boolean {
  return methodKey === "standard" || methodKey === "express";
}

export default function CheckoutPage() {
  const { t } = useLanguage();
  const { currency, formatPrice } = useCurrency();
  const [addressType, setAddressType] = useState<"company" | "another">(
    "company",
  );
  const [shippingMethod, setShippingMethod] = useState<string>("standard");
  const [shippingMethods, setShippingMethods] = useState<
    ShippingMethodOption[]
  >(FALLBACK_SHIPPING_METHODS);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(
    null,
  );
  const [accountEmail, setAccountEmail] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [vatNumber, setVatNumber] = useState(
    shouldAutofillCheckout ? "RO4534966" : "",
  );
  const [vatNumberError, setVatNumberError] = useState(false);
  const [vatFormatError, setVatFormatError] = useState(false);
  const [isVatLookupInProgress, setIsVatLookupInProgress] = useState(false);
  const [manualAddress, setManualAddress] = useState<ManualAddress>({
    firstName: "",
    lastName: "",
    companyName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    postcode: "",
    city: "",
    country: "",
  });
  const cartItems = useCartStore((s) => s.items);
  const cartSubtotal = useCartStore((s) => s.subtotal);
  const setCartItemQuantity = useCartStore((s) => s.setQuantity);
  const removeCartItem = useCartStore((s) => s.removeItem);
  const restoreCartItem = useCartStore((s) => s.restoreItem);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [submitOrderMessage, setSubmitOrderMessage] = useState<string | null>(
    null,
  );
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentBase64, setAttachmentBase64] = useState("");
  const [attachmentMimeType, setAttachmentMimeType] = useState("");
  const backendBaseUrl = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
    if (!value) return "http://localhost:3005";
    return value.endsWith("/") ? value.slice(0, -1) : value;
  }, []);
  const taxPercent = useMemo(() => {
    const value = Number(process.env.NEXT_PUBLIC_TAX_PERCENT ?? "21");
    return Number.isFinite(value) ? value : 21;
  }, []);

  useEffect(() => {
    let isCancelled = false;

    try {
      const cached = localStorage.getItem(SHIPPING_METHODS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as {
          updatedAt?: number;
          data?: ShippingMethodOption[];
        };
        if (
          typeof parsed.updatedAt === "number" &&
          Date.now() - parsed.updatedAt < SHIPPING_METHODS_CACHE_TTL_MS &&
          Array.isArray(parsed.data) &&
          parsed.data.length > 0
        ) {
          setShippingMethods(parsed.data);
          if (!parsed.data.some((method) => method.key === shippingMethod)) {
            setShippingMethod(parsed.data[0]!.key);
          }
        }
      }
    } catch (_error) {
      // Ignore cache read errors and continue with network fetch.
    }

    const loadShippingMethods = async () => {
      try {
        const response = await fetch(`${backendBaseUrl}/api/shipping-methods`);
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: ShippingMethodOption[];
        };
        if (
          !response.ok ||
          payload.ok !== true ||
          !Array.isArray(payload.data)
        ) {
          throw new Error("Failed to load shipping methods");
        }

        const nextMethods = payload.data
          .filter((method) => method.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        if (isCancelled || nextMethods.length === 0) return;

        setShippingMethods(nextMethods);
        if (!nextMethods.some((method) => method.key === shippingMethod)) {
          setShippingMethod(nextMethods[0]!.key);
        }
        localStorage.setItem(
          SHIPPING_METHODS_CACHE_KEY,
          JSON.stringify({
            updatedAt: Date.now(),
            data: nextMethods,
          }),
        );
      } catch (_error) {
        if (isCancelled) return;
      }
    };

    void loadShippingMethods();
    return () => {
      isCancelled = true;
    };
  }, [backendBaseUrl, shippingMethod]);

  useEffect(() => {
    setAccountEmail((localStorage.getItem(AUTH_EMAIL_STORAGE_KEY) ?? "").trim());
  }, []);

  useEffect(() => {
    const loggedInEmail = localStorage.getItem(AUTH_EMAIL_STORAGE_KEY) ?? "";
    if (!loggedInEmail) {
      setAddresses([]);
      setSelectedAddressId(null);
      setAddressType("another");
      setIsLoadingAddresses(false);
      return;
    }

    const controller = new AbortController();
    const loadAddresses = async () => {
      setIsLoadingAddresses(true);
      try {
        const [addressesResponse, profileResponse] = await Promise.all([
          fetch(`${backendBaseUrl}/api/addresses`, {
            credentials: "include",
            signal: controller.signal,
          }),
          fetch(`${backendBaseUrl}/api/auth/profile`, {
            credentials: "include",
            signal: controller.signal,
          }),
        ]);
        const payload = (await addressesResponse.json()) as {
          ok?: boolean;
          data?: UserAddress[];
        };
        const profilePayload = (await profileResponse.json()) as {
          ok?: boolean;
          data?: { vatNumber?: string; companyName?: string };
        };
        if (
          !addressesResponse.ok ||
          payload.ok !== true ||
          !Array.isArray(payload.data)
        ) {
          throw new Error("Failed to load addresses");
        }

        setAddresses(payload.data);
        const defaultAddress =
          payload.data.find((address) => address.isDefaultShipping) ??
          payload.data[0] ??
          null;
        setSelectedAddressId(defaultAddress?.id ?? null);
        if (profileResponse.ok && profilePayload.ok === true && profilePayload.data) {
          const profileVat = String(profilePayload.data.vatNumber ?? "").trim();
          const profileCompanyName = String(
            profilePayload.data.companyName ?? "",
          ).trim();
          // Already-known VAT/company pair from the account profile — seed the
          // cache so we don't hit the external VAT lookup service again just
          // because the user visited checkout.
          if (profileVat && profileCompanyName) {
            rememberVatCompany(profileVat, profileCompanyName);
          }
          setVatNumber((prev) => prev || profileVat);
        }
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
  const selectedShippingMethod =
    shippingMethods.find((method) => method.key === shippingMethod) ??
    shippingMethods[0] ??
    FALLBACK_SHIPPING_METHODS[0];
  const orderShipping = selectedShippingMethod?.price ?? 0;
  const orderVat = +(cartSubtotal * (taxPercent / 100)).toFixed(2);
  const orderTotal = +(cartSubtotal + orderVat + orderShipping).toFixed(2);

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      setSubmitOrderMessage(t("checkout.error.cartEmpty"));
      return;
    }

    const belowMinQty = cartItems.find((item) => item.quantity < MIN_ORDER_QTY);
    if (belowMinQty) {
      setSubmitOrderMessage(t("checkout.error.minOrderQty"));
      return;
    }

    const loggedInEmail = (
      localStorage.getItem(AUTH_EMAIL_STORAGE_KEY) ?? ""
    ).trim();
    let checkoutEmail = loggedInEmail;
    if (!checkoutEmail) {
      checkoutEmail = guestEmail.trim().toLowerCase();
      if (!checkoutEmail) {
        setSubmitOrderMessage(t("checkout.error.emailRequired"));
        return;
      }
      if (!GUEST_EMAIL_PATTERN.test(checkoutEmail)) {
        setSubmitOrderMessage(t("checkout.error.emailInvalid"));
        return;
      }
    }

    const activeAddress =
      addressType === "another"
        ? {
            firstName: manualAddress.firstName.trim(),
            lastName: manualAddress.lastName.trim(),
            companyName: manualAddress.companyName.trim(),
            phone: manualAddress.phone.trim(),
            addressLine1: manualAddress.addressLine1.trim(),
            postcode: manualAddress.postcode.trim(),
            city: manualAddress.city.trim(),
            country: manualAddress.country.trim(),
          }
        : {
            firstName: selectedAddress?.firstName.trim() ?? "",
            lastName: selectedAddress?.lastName.trim() ?? "",
            companyName:
              manualAddress.companyName.trim() ||
              selectedAddress?.companyName.trim() ||
              "",
            phone: selectedAddress?.phone.trim() ?? "",
            addressLine1: selectedAddress?.addressLine1.trim() ?? "",
            postcode: selectedAddress?.postcode.trim() ?? "",
            city: selectedAddress?.city.trim() ?? "",
            country: selectedAddress?.country.trim() ?? "",
          };

    if (
      !activeAddress.firstName ||
      !activeAddress.lastName ||
      !activeAddress.addressLine1 ||
      !activeAddress.postcode ||
      !activeAddress.city ||
      !activeAddress.country
    ) {
      setSubmitOrderMessage(t("checkout.error.addressIncomplete"));
      return;
    }

    const normalizedVat = normalizeVatNumber(vatNumber);
    if (isVatLookupInProgress) {
      setSubmitOrderMessage(t("contact.vatLookupInProgress"));
      return;
    }
    if (!normalizedVat) {
      setVatNumberError(true);
      setVatFormatError(false);
      setSubmitOrderMessage(t("checkout.error.vatNumberRequired"));
      return;
    }
    if (!VAT_NUMBER_REGEX.test(normalizedVat)) {
      setVatNumberError(false);
      setVatFormatError(true);
      setSubmitOrderMessage(t("checkout.error.vatNumberInvalid"));
      return;
    }
    setVatNumberError(false);
    setVatFormatError(false);

    if (!activeAddress.companyName) {
      setSubmitOrderMessage(t("contact.vatLookupFailed"));
      return;
    }

    const shippingDisplay = getShippingMethodDisplay(selectedShippingMethod, t);

    setIsSubmittingOrder(true);
    setSubmitOrderMessage(t("checkout.redirecting"));
    try {
      const response = await fetch(
        `${backendBaseUrl}/api/payments/create-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: checkoutEmail,
            currency,
            cartItems: cartItems.map((item) => ({
              itemNo: item.itemNo,
              name: item.name,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              imageUrl: item.imageUrl ?? null,
            })),
            shipping: {
              name: shippingDisplay.name,
              etaText: shippingDisplay.etaText,
              price: orderShipping,
            },
            vatPercent: taxPercent,
            address: {
              firstName: activeAddress.firstName,
              lastName: activeAddress.lastName,
              companyName: activeAddress.companyName,
              phone: activeAddress.phone,
              address: activeAddress.addressLine1,
              postcode: activeAddress.postcode,
              city: activeAddress.city,
              country: activeAddress.country,
            },
            vatNumber: normalizedVat,
            consentPhone: true,
            consentEmail: true,
            acceptedTerms: true,
            attachment:
              attachmentName && attachmentBase64
                ? {
                    fileName: attachmentName,
                    contentBase64: attachmentBase64,
                    mimeType: attachmentMimeType || null,
                  }
                : null,
          }),
        },
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        data?: { url?: string; orderId?: number; sessionId?: string };
      };
      if (!response.ok || payload.ok !== true || !payload.data?.url) {
        throw new Error(
          payload.message ?? `Failed with status ${response.status}`,
        );
      }

      try {
        sessionStorage.setItem(
          "boxmag.checkout.pendingOrderId",
          String(payload.data.orderId ?? ""),
        );
      } catch (_storageError) {
        // ignore
      }

      window.location.href = payload.data.url;
    } catch (error) {
      setSubmitOrderMessage(
        error instanceof Error
          ? error.message
          : t("checkout.error.startCheckout"),
      );
      setIsSubmittingOrder(false);
    }
  };
  const defaultShippingAddress =
    addresses.find((address) => address.isDefaultShipping) ??
    addresses[0] ??
    null;

  useEffect(() => {
    if (addresses.length === 0) {
      setAddressType("another");
      setSelectedAddressId(null);
      return;
    }

    setAddressType("company");
    setSelectedAddressId(defaultShippingAddress?.id ?? null);
  }, [addresses, defaultShippingAddress?.id]);

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
          <span className="text-gray-700 font-semibold">
            {t("checkout.breadcrumb.checkout")}
          </span>
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
        <CheckoutProductDetails
          cartItems={cartItems}
          setCartItemQuantity={setCartItemQuantity}
          removeCartItem={removeCartItem}
          restoreCartItem={restoreCartItem}
          formatPrice={formatPrice}
          t={t}
        />
        <BottomPadding />
        <CheckoutShippingInformation
          addressType={addressType}
          setAddressType={setAddressType}
          addresses={addresses}
          isLoadingAddresses={isLoadingAddresses}
          selectedAddressId={selectedAddressId}
          setSelectedAddressId={setSelectedAddressId}
          selectedAddress={selectedAddress}
          manualAddress={manualAddress}
          setManualAddress={setManualAddress}
          defaultShippingAddress={defaultShippingAddress}
          isLoggedIn={accountEmail.length > 0}
          guestEmail={guestEmail}
          setGuestEmail={setGuestEmail}
          vatNumber={vatNumber}
          vatNumberError={vatNumberError}
          vatFormatError={vatFormatError}
          onVatNumberChange={(value) => {
            setVatNumber(value);
            if (value.trim().length > 0) {
              setVatNumberError(false);
              setVatFormatError(false);
            }
          }}
          onVatLookupStateChange={setIsVatLookupInProgress}
        />
        <BottomPadding />
        <ShippingMethod
          shippingMethod={shippingMethod}
          setShippingMethod={setShippingMethod}
          shippingMethods={shippingMethods}
        />
        <BottomPadding className="pb-6" />
        <OrderAttachmentSection
          attachmentName={attachmentName}
          onAttachmentSelected={(payload) => {
            setAttachmentName(payload.fileName);
            setAttachmentBase64(payload.contentBase64);
            setAttachmentMimeType(payload.mimeType);
          }}
          onAttachmentCleared={() => {
            setAttachmentName("");
            setAttachmentBase64("");
            setAttachmentMimeType("");
          }}
          onError={(message) => setSubmitOrderMessage(message)}
        />
        <BottomPadding />
        <hr className="border-gray-200" />
        <BottomPadding />
        {/* Checkout Summary Bar */}
        <CheckoutSummaryBar
          subtotal={cartSubtotal}
          vatPercent={taxPercent}
          shipping={orderShipping}
          formatPrice={formatPrice}
          onContinueHref="/boxesfetco"
          onPlaceOrder={() => void handlePlaceOrder()}
          isSubmittingOrder={isSubmittingOrder}
          submitOrderMessage={submitOrderMessage}
        />
        <BottomPadding />
      </ResponsiveLayoutWithPadding>

      <ServicesSection />
      <HaveAQuestion />
      <NewsletterSubscribe />
    </div>
  );

  function CheckoutSummaryBar({
    subtotal,
    vatPercent,
    shipping,
    formatPrice,
    onContinueHref = "/boxesfetco",
    onPlaceOrder,
    isSubmittingOrder,
    submitOrderMessage,
  }: {
    subtotal: number;
    vatPercent: number;
    shipping: number;
    formatPrice: (amountEur: number) => string;
    onContinueHref?: string;
    onPlaceOrder: () => void;
    isSubmittingOrder: boolean;
    submitOrderMessage: string | null;
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
              <div className="font-semibold tracking-wide">
                {t("checkout.subtotal")}
              </div>
              <div className="text-my-gray">{formatPrice(subtotal)}</div>
              <div className="font-semibold tracking-wide">
                {t("checkout.vatTax")} ({vatPercent}%)
              </div>
              <div className="text-my-gray">{formatPrice(vat)}</div>
              <div className="font-semibold tracking-wide">
                {t("checkout.shipping")}
              </div>
              <div className="text-my-gray">{formatPrice(shipping)}</div>
            </div>
            <div className="mt-6">
              <div className="inline-flex items-center gap-2 rounded-full border-2 border-my-red px-6 py-3">
                <span className="text-sm font-semibold uppercase tracking-wide text-my-red">
                  {t("checkout.total")}
                </span>
                <span className="text-base font-bold">
                  {formatPrice(total)}
                </span>
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={onPlaceOrder}
                  disabled={isSubmittingOrder}
                  className="inline-flex items-center justify-center rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-my-red/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingOrder
                    ? t("checkout.placingOrder")
                    : t("checkout.placeOrder")}
                </button>
                {submitOrderMessage ? (
                  <p className="mt-2 text-sm text-gray-700">
                    {submitOrderMessage}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function CartHeader() {
    return (
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl">
            {t("checkout.shoppingCart")}
          </span>
          <span className="bg-my-red rounded-full w-6 h-6 flex items-center justify-center text-white text-sm font-semibold">
            {cartItems.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <GrayText text={t("checkout.orderType")} />
          <GrayText text={t("common.b2b")} />
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

  function ShippingMethod({
    shippingMethod,
    setShippingMethod,
    shippingMethods,
  }: {
    shippingMethod: string;
    setShippingMethod: (v: string) => void;
    shippingMethods: ShippingMethodOption[];
  }) {
    return (
      <div className="w-full">
        <h2 className="font-bold text-black text-base sm:text-lg mb-4 uppercase tracking-wide">
          {t("checkout.shippingMethod")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {shippingMethods.map((method) => {
            const display = getShippingMethodDisplay(method, t);
            return (
            <button
              key={method.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const scrollY = window.scrollY;
                setShippingMethod(method.key);
                const btn = e.currentTarget as HTMLButtonElement;
                btn.blur();
                requestAnimationFrame(() => window.scrollTo(0, scrollY));
              }}
              className={`flex items-start gap-4 p-5 rounded-lg border-2 text-left transition-colors ${
                shippingMethod === method.key
                  ? "border-my-red bg-white"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <span
                className={`shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  shippingMethod === method.key
                    ? "border-my-red"
                    : "border-gray-300"
                }`}
              >
                {shippingMethod === method.key && (
                  <span className="h-2.5 w-2.5 rounded-full bg-my-red" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-black">{display.name}</p>
                <p className="text-gray-500 text-sm mt-0.5">{display.etaText}</p>
                {isDpdCarrierMethod(method.key) ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-xs text-gray-600">
                      {t("checkout.shippingCarrierDpd")}
                    </p>
                    <Image
                      src="/logos/DPD_logo_redgrad_rgb.png"
                      alt="DPD"
                      width={88}
                      height={28}
                      className="h-5 w-auto object-contain"
                    />
                  </div>
                ) : null}
                <p className="font-bold text-black mt-2">
                  {formatPrice(method.price)}
                </p>
              </div>
            </button>
          );
          })}
        </div>
      </div>
    );
  }
}

function OrderAttachmentSection({
  attachmentName,
  onAttachmentSelected,
  onAttachmentCleared,
  onError,
}: {
  attachmentName: string;
  onAttachmentSelected: (payload: {
    fileName: string;
    contentBase64: string;
    mimeType: string;
  }) => void;
  onAttachmentCleared: () => void;
  onError: (message: string) => void;
}) {
  return (
    <div className="w-full">
      <label className="mb-2 block text-sm font-semibold text-gray-800">
        Attachment (optional)
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center rounded-lg bg-my-yellow px-4 py-2.5 text-sm font-semibold text-black hover:bg-my-yellow-bright">
          <input
            type="file"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                onAttachmentCleared();
                return;
              }
              if (file.size > MAX_ATTACHMENT_BYTES) {
                onError(`Attachment is too large (max ${MAX_ATTACHMENT_MB} MB).`);
                onAttachmentCleared();
                event.currentTarget.value = "";
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                const result = typeof reader.result === "string" ? reader.result : "";
                if (!result) {
                  onError("Failed to read attachment.");
                  onAttachmentCleared();
                  return;
                }
                onAttachmentSelected({
                  fileName: file.name,
                  contentBase64: result,
                  mimeType: file.type || "application/octet-stream",
                });
              };
              reader.onerror = () => {
                onError("Failed to read attachment.");
                onAttachmentCleared();
              };
              reader.readAsDataURL(file);
            }}
          />
          Choose File
        </label>
        <span className="max-w-full truncate text-sm text-gray-600">
          {attachmentName || "No file chosen"}
        </span>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Accepted max file size: {MAX_ATTACHMENT_MB} MB.
      </p>
    </div>
  );
}

function CheckoutCartQuantityInput({
  quantity,
  onCommit,
  decreaseAriaLabel,
  increaseAriaLabel,
  onDecrease,
  onIncrease,
  onIncreaseByMin,
}: {
  quantity: number;
  onCommit: (quantity: number) => void;
  decreaseAriaLabel: string;
  increaseAriaLabel: string;
  onDecrease: () => void;
  onIncrease: () => void;
  onIncreaseByMin: () => void;
}) {
  const [draftQuantity, setDraftQuantity] = useState(String(quantity));

  useEffect(() => {
    setDraftQuantity(String(quantity));
  }, [quantity]);

  const commitDraftQuantity = () => {
    const trimmed = draftQuantity.trim();
    if (!trimmed) {
      setDraftQuantity(String(quantity));
      return;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setDraftQuantity(String(quantity));
      return;
    }

    onCommit(Math.max(MIN_ORDER_QTY, Math.floor(parsed)));
  };

  return (
    <>
      <button
        type="button"
        onClick={onDecrease}
        className="h-8 w-8 rounded border border-gray-300 text-base leading-none hover:bg-gray-50"
        aria-label={decreaseAriaLabel}
      >
        -
      </button>
      <input
        type="number"
        min={MIN_ORDER_QTY}
        step={CART_QTY_STEP}
        value={draftQuantity}
        onChange={(e) => setDraftQuantity(e.target.value)}
        onBlur={commitDraftQuantity}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitDraftQuantity();
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        className="w-20 rounded border border-gray-300 px-2 py-1 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={onIncrease}
        className="h-8 w-8 rounded border border-gray-300 text-base leading-none hover:bg-gray-50"
        aria-label={increaseAriaLabel}
      >
        +
      </button>
      <button
        type="button"
        onClick={onIncreaseByMin}
        className="h-8 rounded border border-gray-300 px-2 text-xs font-semibold leading-none hover:bg-gray-50"
        aria-label="Increase quantity by 100"
      >
        + 100
      </button>
    </>
  );
}

function CheckoutProductColumn({
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
    <div className="flex min-w-0 flex-1 flex-col justify-center">
      <div className="flex flex-wrap gap-x-2 gap-y-1">
        <span className="font-bold">{name1}</span>
        <span className="text-my-gray">{value1}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
        <span className="font-bold">{name2}</span>
        <span className="text-my-gray">{value2}</span>
      </div>
    </div>
  );
}

const REMOVED_ITEM_UNDO_MS = 10000;

function CheckoutProductDetails({
  cartItems,
  setCartItemQuantity,
  removeCartItem,
  restoreCartItem,
  formatPrice,
  t,
}: {
  cartItems: CartItem[];
  setCartItemQuantity: (itemNo: string, quantity: number) => void;
  removeCartItem: (itemNo: string) => void;
  restoreCartItem: (item: CartItem) => void;
  formatPrice: (amountEur: number) => string;
  t: (key: string) => string;
}) {
  const [removedItem, setRemovedItem] = useState<CartItem | null>(null);
  const undoTimeoutRef = useRef<number | null>(null);

  const clearRemovedItem = () => {
    if (undoTimeoutRef.current != null) {
      window.clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
    setRemovedItem(null);
  };

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current != null) {
        window.clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  const handleRemoveItem = (item: CartItem) => {
    clearRemovedItem();
    setRemovedItem(item);
    removeCartItem(item.itemNo);
    undoTimeoutRef.current = window.setTimeout(() => {
      setRemovedItem(null);
      undoTimeoutRef.current = null;
    }, REMOVED_ITEM_UNDO_MS);
  };

  const handleUndoRemove = () => {
    if (!removedItem) return;
    restoreCartItem(removedItem);
    clearRemovedItem();
  };

  if (cartItems.length === 0 && !removedItem) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
        {t("checkout.cartEmpty")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {removedItem ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>
            {t("checkout.removedProduct")
              .replace("{{name}}", removedItem.name)
              .replace("{{qty}}", String(removedItem.quantity))}
          </p>
          <button
            type="button"
            onClick={handleUndoRemove}
            className="inline-flex shrink-0 items-center justify-center rounded-md bg-my-red px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-my-red/90"
          >
            {t("checkout.undoRemove")}
          </button>
        </div>
      ) : null}
      {cartItems.map((item) => (
        <div
          key={item.itemNo}
          className="flex flex-col gap-6 rounded-lg border border-gray-200 p-4 text-sm"
        >
          {/**
           * Older persisted cart entries may still contain local MinIO URLs.
           * Normalize them to the public CDN to avoid broken images on production domain.
           */}
          {(() => {
            const rawImageUrl = item.imageUrl?.trim() ?? "";
            const imageSrc = rawImageUrl
              ? rawImageUrl.replace(
                  /^http:\/\/localhost:9000(?=\/)/,
                  "https://cdn.boxmag.eu",
                )
              : "/b2b/boxes/box.png";
            return (
          <div className="flex w-full flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex h-[100px] w-[100px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt={item.name}
                width={100}
                height={100}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </div>
            <CheckoutProductColumn
              name1={t("checkout.product.itemNo")}
              value1={item.itemNo}
              name2={t("checkout.product.productName")}
              value2={item.name}
            />
            <CheckoutProductColumn
              name1={t("checkout.product.amountQty")}
              value1={String(item.quantity)}
              name2={t("checkout.product.palletPcs")}
              value2="-"
            />
            <CheckoutProductColumn
              name1={t("checkout.product.netWeight")}
              value1="-"
              name2={t("checkout.product.priceWithoutTax")}
              value2={formatPrice(item.unitPrice * item.quantity)}
            />
          </div>
            );
          })()}
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold">{t("checkout.quantity")}</span>
              <CheckoutCartQuantityInput
                quantity={item.quantity}
                decreaseAriaLabel={t("checkout.aria.decreaseQuantity")}
                increaseAriaLabel={t("checkout.aria.increaseQuantity")}
                onCommit={(nextQuantity) =>
                  setCartItemQuantity(item.itemNo, nextQuantity)
                }
                onDecrease={() =>
                  setCartItemQuantity(
                    item.itemNo,
                    Math.max(MIN_ORDER_QTY, item.quantity - CART_QTY_STEP),
                  )
                }
                onIncrease={() =>
                  setCartItemQuantity(
                    item.itemNo,
                    item.quantity + CART_QTY_STEP,
                  )
                }
                onIncreaseByMin={() =>
                  setCartItemQuantity(
                    item.itemNo,
                    item.quantity + MIN_ORDER_QTY,
                  )
                }
              />
            </div>
            <button
              type="button"
              onClick={() => handleRemoveItem(item)}
              className="inline-flex items-center gap-2 rounded border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              <FaTrashAlt className="h-3.5 w-3.5" />
              {t("checkout.removeProduct")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
