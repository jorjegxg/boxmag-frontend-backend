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
import { FaTrashAlt } from "react-icons/fa";

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
const SHIPPING_METHODS_CACHE_KEY = "boxmag.checkout.shippingMethods.v1";
const SHIPPING_METHODS_CACHE_TTL_MS = 1000 * 60 * 60 * 12;

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

export default function CheckoutPage() {
  const { t } = useLanguage();
  const [addressType, setAddressType] = useState<"company" | "another">("company");
  const [shippingMethod, setShippingMethod] = useState<string>("standard");
  const [shippingMethods, setShippingMethods] = useState<ShippingMethodOption[]>(
    FALLBACK_SHIPPING_METHODS,
  );
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
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
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [submitOrderMessage, setSubmitOrderMessage] = useState<string | null>(null);
  const backendBaseUrl = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
    if (!value) return "http://localhost:3005";
    return value.endsWith("/") ? value.slice(0, -1) : value;
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
        if (!response.ok || payload.ok !== true || !Array.isArray(payload.data)) {
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
  const selectedShippingMethod =
    shippingMethods.find((method) => method.key === shippingMethod) ??
    shippingMethods[0] ??
    FALLBACK_SHIPPING_METHODS[0];
  const orderShipping = selectedShippingMethod?.price ?? 0;
  const orderVat = +(cartSubtotal * (19 / 100)).toFixed(2);
  const orderTotal = +(cartSubtotal + orderVat + orderShipping).toFixed(2);

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      setSubmitOrderMessage(t("checkout.error.cartEmpty"));
      return;
    }

    const loggedInEmail = (localStorage.getItem(AUTH_EMAIL_STORAGE_KEY) ?? "").trim();
    if (!loggedInEmail) {
      setSubmitOrderMessage(t("checkout.error.loginRequired"));
      return;
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
            companyName: selectedAddress?.companyName.trim() ?? "",
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
            email: loggedInEmail,
            cartItems: cartItems.map((item) => ({
              itemNo: item.itemNo,
              name: item.name,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              imageUrl: item.imageUrl ?? null,
            })),
            shipping: {
              name: selectedShippingMethod?.name ?? "N/A",
              etaText: selectedShippingMethod?.etaText ?? "",
              price: orderShipping,
            },
            vatPercent: 19,
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
            vatNumber: null,
            consentPhone: true,
            consentEmail: true,
            acceptedTerms: true,
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
        error instanceof Error ? error.message : t("checkout.error.startCheckout"),
      );
      setIsSubmittingOrder(false);
    }
  };
  const defaultShippingAddress =
    addresses.find((address) => address.isDefaultShipping) ?? addresses[0] ?? null;
  const alternativeAddresses = addresses.filter(
    (address) => address.id !== defaultShippingAddress?.id,
  );

  useEffect(() => {
    if (addresses.length === 0) {
      setAddressType("another");
      setSelectedAddressId(null);
      return;
    }

    if (addressType === "company") {
      setSelectedAddressId(defaultShippingAddress?.id ?? null);
      return;
    }

    setSelectedAddressId(null);
  }, [
    addressType,
    addresses,
    alternativeAddresses,
    defaultShippingAddress,
  ]);

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
        <ShippingMethod
          shippingMethod={shippingMethod}
          setShippingMethod={setShippingMethod}
          shippingMethods={shippingMethods}
        />
        <BottomPadding />
        <hr className="border-gray-200" />
        <BottomPadding />
        {/* Checkout Summary Bar */}
        <CheckoutSummaryBar
          subtotal={cartSubtotal}
          vatPercent={19}
          shipping={orderShipping}
          currency="€"
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

  function money(value: number, currency: string) {
    return `${currency} ${value.toFixed(2)}`;
  }

  function CheckoutSummaryBar({
    subtotal,
    vatPercent,
    shipping,
    currency = "€",
    onContinueHref = "/boxesfetco",
    onPlaceOrder,
    isSubmittingOrder,
    submitOrderMessage,
  }: {
    subtotal: number;
    vatPercent: number;
    shipping: number;
    currency?: string;
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
              <div className="mt-3">
                <button
                  type="button"
                  onClick={onPlaceOrder}
                  disabled={isSubmittingOrder}
                  className="inline-flex items-center justify-center rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-my-red/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingOrder ? t("checkout.placingOrder") : t("checkout.placeOrder")}
                </button>
                {submitOrderMessage ? (
                  <p className="mt-2 text-sm text-gray-700">{submitOrderMessage}</p>
                ) : null}
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
          {t("checkout.cartEmpty")}
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
              src={item.imageUrl || "/b2b/boxes/box.png"}
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
            <div className="flex min-w-[220px] flex-col items-start justify-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold">{t("checkout.quantity")}</span>
                <button
                  type="button"
                  onClick={() => setCartItemQuantity(item.itemNo, Math.max(1, item.quantity - 1))}
                  className="h-8 w-8 rounded border border-gray-300 text-base leading-none hover:bg-gray-50"
                  aria-label={t("checkout.aria.decreaseQuantity")}
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => {
                    const parsed = Number(e.target.value);
                    if (!Number.isFinite(parsed)) return;
                    setCartItemQuantity(item.itemNo, Math.max(1, Math.floor(parsed)));
                  }}
                  className="w-20 rounded border border-gray-300 px-2 py-1 text-center"
                />
                <button
                  type="button"
                  onClick={() => setCartItemQuantity(item.itemNo, item.quantity + 1)}
                  className="h-8 w-8 rounded border border-gray-300 text-base leading-none hover:bg-gray-50"
                  aria-label={t("checkout.aria.increaseQuantity")}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeCartItem(item.itemNo)}
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
    const hasSavedAddresses = addresses.length > 0;

    return (
      <div className="w-full">
        <h2 className="font-bold text-black text-base sm:text-lg mb-4 uppercase tracking-wide">
          {t("checkout.shippingInfo")}
        </h2>
        <div className="rounded-lg border-2 border-gray-200 bg-white overflow-hidden">
          <div className="flex flex-col sm:flex-row min-h-[160px]">
            <div className="flex-1 p-6 flex flex-col justify-center">
              {isLoadingAddresses ? (
                <p className="text-sm text-gray-600">{t("checkout.address.loading")}</p>
              ) : addressType === "another" ? (
                <>
                  <p className="font-bold text-black">
                    {[manualAddress.firstName, manualAddress.lastName]
                      .filter(Boolean)
                      .join(" ")
                      .trim() || t("checkout.address.newAddress")}
                  </p>
                  {manualAddress.companyName ? (
                    <p className="text-gray-600 text-sm mt-1">{manualAddress.companyName}</p>
                  ) : null}
                  {manualAddress.addressLine1 ? (
                    <p className="text-gray-600 text-sm mt-1">{manualAddress.addressLine1}</p>
                  ) : (
                    <p className="text-gray-600 text-sm mt-1">
                      {t("checkout.address.fillFormHint")}
                    </p>
                  )}
                  {manualAddress.addressLine2 ? (
                    <p className="text-gray-600 text-sm">{manualAddress.addressLine2}</p>
                  ) : null}
                  {(manualAddress.postcode || manualAddress.city) && (
                    <p className="text-gray-600 text-sm">
                      {manualAddress.postcode} {manualAddress.city}
                    </p>
                  )}
                  {manualAddress.country ? (
                    <p className="text-gray-600 text-sm">{manualAddress.country}</p>
                  ) : null}
                  {manualAddress.phone ? (
                    <p className="text-gray-600 text-sm mt-2">
                      {t("checkout.address.tel")} {manualAddress.phone}
                    </p>
                  ) : null}
                </>
              ) : !selectedAddress ? (
                <>
                  <p className="font-bold text-black">{t("checkout.address.noAddressTitle")}</p>
                  <p className="text-gray-600 text-sm mt-1">
                    {t("checkout.address.noAddressHint")}
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
                      {t("checkout.address.tel")} {selectedAddress.phone}
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
          {addressType === "company" ? (
            <p className="text-sm text-gray-600">
              {t("checkout.address.companyDefaultHint")}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={manualAddress.firstName}
                onChange={(e) =>
                  setManualAddress((prev) => ({ ...prev, firstName: e.target.value }))
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red"
                placeholder={t("checkout.placeholder.firstName")}
              />
              <input
                type="text"
                value={manualAddress.lastName}
                onChange={(e) =>
                  setManualAddress((prev) => ({ ...prev, lastName: e.target.value }))
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red"
                placeholder={t("checkout.placeholder.lastName")}
              />
              <input
                type="text"
                value={manualAddress.companyName}
                onChange={(e) =>
                  setManualAddress((prev) => ({ ...prev, companyName: e.target.value }))
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red sm:col-span-2"
                placeholder={t("checkout.placeholder.companyName")}
              />
              <input
                type="text"
                value={manualAddress.addressLine1}
                onChange={(e) =>
                  setManualAddress((prev) => ({ ...prev, addressLine1: e.target.value }))
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red sm:col-span-2"
                placeholder={t("checkout.placeholder.addressLine1")}
              />
              <input
                type="text"
                value={manualAddress.addressLine2}
                onChange={(e) =>
                  setManualAddress((prev) => ({ ...prev, addressLine2: e.target.value }))
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red sm:col-span-2"
                placeholder={t("checkout.placeholder.addressLine2")}
              />
              <input
                type="text"
                value={manualAddress.postcode}
                onChange={(e) =>
                  setManualAddress((prev) => ({ ...prev, postcode: e.target.value }))
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red"
                placeholder={t("checkout.placeholder.postcode")}
              />
              <input
                type="text"
                value={manualAddress.city}
                onChange={(e) =>
                  setManualAddress((prev) => ({ ...prev, city: e.target.value }))
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red"
                placeholder={t("checkout.placeholder.city")}
              />
              <input
                type="text"
                value={manualAddress.country}
                onChange={(e) =>
                  setManualAddress((prev) => ({ ...prev, country: e.target.value }))
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red"
                placeholder={t("checkout.placeholder.country")}
              />
              <input
                type="tel"
                value={manualAddress.phone}
                onChange={(e) =>
                  setManualAddress((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red"
                placeholder={t("checkout.placeholder.phone")}
              />
            </div>
          )}
          {hasSavedAddresses ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const scrollY = window.scrollY;
                  setAddressType("company");
                  const btn = e.currentTarget as HTMLButtonElement;
                  requestAnimationFrame(() => {
                    btn.blur();
                    window.scrollTo(0, scrollY);
                  });
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
                  e.stopPropagation();
                  const scrollY = window.scrollY;
                  setAddressType("another");
                  const btn = e.currentTarget as HTMLButtonElement;
                  requestAnimationFrame(() => {
                    btn.blur();
                    window.scrollTo(0, scrollY);
                  });
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
          ) : null}
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
          {shippingMethods.map((method) => (
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
                  shippingMethod === method.key ? "border-my-red" : "border-gray-300"
                }`}
              >
                {shippingMethod === method.key && (
                  <span className="h-2.5 w-2.5 rounded-full bg-my-red" />
                )}
              </span>
              <div>
                <p className="font-bold text-black">{method.name}</p>
                <p className="text-gray-500 text-sm mt-0.5">{method.etaText}</p>
                <p className="font-bold text-black mt-2">€ {method.price.toFixed(2)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }
}
