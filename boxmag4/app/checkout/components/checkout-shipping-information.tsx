"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useLanguage } from "../../i18n/language-context";
import {
  CheckoutAddressMap,
  type MapAddressInput,
} from "./checkout-address-map";
import {
  mergeVatLookupFields,
  type VatLookupAddressFields,
} from "../../../lib/parse-vat-address";
import {
  fetchVatLookup,
  getCachedVatCompany,
  vatPayloadToAddressFields,
} from "../../../lib/vat-company";

const VAT_NUMBER_REGEX = /^[A-Z]{2}[A-Z0-9]{2,12}$/;

function normalizeVatNumber(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

const lockedInputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600 cursor-not-allowed focus:outline-none";

export type CheckoutUserAddress = {
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

export type CheckoutManualAddress = {
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

type CheckoutShippingInformationProps = {
  addressType: "company" | "another";
  setAddressType: (v: "company" | "another") => void;
  addresses: CheckoutUserAddress[];
  isLoadingAddresses: boolean;
  selectedAddressId: number | null;
  setSelectedAddressId: (value: number | null) => void;
  selectedAddress: CheckoutUserAddress | null;
  manualAddress: CheckoutManualAddress;
  setManualAddress: Dispatch<SetStateAction<CheckoutManualAddress>>;
  defaultShippingAddress: CheckoutUserAddress | null;
  isLoggedIn: boolean;
  guestEmail: string;
  setGuestEmail: Dispatch<SetStateAction<string>>;
  vatNumber: string;
  vatNumberError: boolean;
  vatFormatError: boolean;
  onVatNumberChange: (value: string) => void;
  onVatLookupStateChange?: (isLookingUp: boolean) => void;
};

export function CheckoutShippingInformation({
  addressType,
  setAddressType,
  addresses,
  isLoadingAddresses,
  selectedAddressId,
  setSelectedAddressId,
  selectedAddress,
  manualAddress,
  setManualAddress,
  defaultShippingAddress,
  isLoggedIn,
  guestEmail,
  setGuestEmail,
  vatNumber,
  vatNumberError,
  vatFormatError,
  onVatNumberChange,
  onVatLookupStateChange,
}: CheckoutShippingInformationProps) {
  const { t } = useLanguage();
  const [isLookingUpVat, setIsLookingUpVat] = useState(false);
  const [vatLookupError, setVatLookupError] = useState<string | null>(null);
  const hasSavedAddresses = addresses.length > 0;
  const useManualAddressForm = !hasSavedAddresses || addressType === "another";
  const displayCompanyName =
    manualAddress.companyName.trim() ||
    selectedAddress?.companyName.trim() ||
    "";

  const updateIsLookingUpVat = (value: boolean) => {
    setIsLookingUpVat(value);
    onVatLookupStateChange?.(value);
  };

  useEffect(() => {
    const normalizedVat = normalizeVatNumber(vatNumber);
    if (!VAT_NUMBER_REGEX.test(normalizedVat)) {
      setManualAddress((prev) => ({ ...prev, companyName: "" }));
      setVatLookupError(null);
      return;
    }

    const cachedCompany = getCachedVatCompany(normalizedVat);
    if (cachedCompany) {
      setManualAddress((prev) => ({ ...prev, companyName: cachedCompany }));
      setVatLookupError(null);
      updateIsLookingUpVat(false);
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      updateIsLookingUpVat(true);
      setVatLookupError(null);

      try {
        const payload = await fetchVatLookup(normalizedVat, controller.signal);

        if (isCancelled) return;

        if (payload.ok !== true || !payload.companyName) {
          setManualAddress((prev) => ({ ...prev, companyName: "" }));
          setVatLookupError(
            payload.message ?? t("contact.vatLookupFailed"),
          );
          return;
        }

        const lookupFields: VatLookupAddressFields =
          vatPayloadToAddressFields(payload);

        setManualAddress((prev) =>
          mergeVatLookupFields(prev, lookupFields, {
            companyName: "companyName",
            addressLine1: "addressLine1",
            addressLine2: "addressLine2",
            city: "city",
            postcode: "postcode",
            country: "country",
            phone: "phone",
          }),
        );
        setVatLookupError(null);
      } catch (error) {
        if (isCancelled || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }
        setManualAddress((prev) => ({ ...prev, companyName: "" }));
        setVatLookupError(t("contact.vatLookupFailed"));
      } finally {
        if (!isCancelled) {
          updateIsLookingUpVat(false);
        }
      }
    }, 600);

    return () => {
      isCancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [vatNumber, t, setManualAddress]);

  const mapAddress: MapAddressInput | null = useMemo(() => {
    if (useManualAddressForm) {
      return {
        addressLine1: manualAddress.addressLine1,
        addressLine2: manualAddress.addressLine2,
        city: manualAddress.city,
        country: manualAddress.country,
      };
    }
    if (!selectedAddress) return null;
    return {
      addressLine1: selectedAddress.addressLine1,
      addressLine2: selectedAddress.addressLine2,
      city: selectedAddress.city,
      country: selectedAddress.country,
    };
  }, [
    useManualAddressForm,
    manualAddress.addressLine1,
    manualAddress.addressLine2,
    manualAddress.city,
    manualAddress.country,
    selectedAddress?.addressLine1,
    selectedAddress?.addressLine2,
    selectedAddress?.city,
    selectedAddress?.country,
  ]);

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
            ) : useManualAddressForm ? (
              <>
                <p className="font-bold text-black">
                  {[manualAddress.firstName, manualAddress.lastName]
                    .filter(Boolean)
                    .join(" ")
                    .trim() || t("checkout.address.newAddress")}
                </p>
                {displayCompanyName ? (
                  <p className="text-gray-600 text-sm mt-1">{displayCompanyName}</p>
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
                {displayCompanyName ? (
                  <p className="text-gray-600 text-sm mt-1">{displayCompanyName}</p>
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
          <div className="h-40 w-full shrink-0 overflow-hidden sm:h-auto sm:min-h-[160px] sm:w-64">
            <CheckoutAddressMap address={mapAddress} />
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div>
          <label
            htmlFor="checkout-vatNumber"
            className="mb-1 block text-sm font-semibold text-gray-800"
          >
            {t("checkout.vatNumber")} *
          </label>
          <input
            id="checkout-vatNumber"
            type="text"
            value={vatNumber}
            onChange={(e) => onVatNumberChange(e.target.value.toUpperCase())}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red ${
              vatNumberError || vatFormatError || vatLookupError
                ? "border-red-500 bg-red-50"
                : "border-gray-300"
            }`}
            placeholder={t("checkout.placeholder.vatNumber")}
            pattern="[A-Za-z]{2}\s?[A-Za-z0-9]{2,12}"
            title="Use country code plus 2-12 letters/digits (e.g. RO12345678 or RO 12345678)"
            autoComplete="off"
            required
            aria-describedby={vatLookupError ? "checkout-vatNumber-error" : undefined}
          />
          {isLookingUpVat ? (
            <p className="mt-1 text-sm text-gray-500">
              {t("contact.vatLookupLoading")}
            </p>
          ) : null}
          {vatNumberError ? (
            <p className="mt-1 text-sm text-red-600">
              {t("checkout.error.vatNumberRequired")}
            </p>
          ) : null}
          {!vatNumberError && vatFormatError ? (
            <p className="mt-1 text-sm text-red-600">
              {t("checkout.error.vatNumberInvalid")}
            </p>
          ) : null}
          {!vatNumberError && !vatFormatError && !isLookingUpVat && vatLookupError ? (
            <p id="checkout-vatNumber-error" className="mt-1 text-sm text-red-600">
              {vatLookupError}
            </p>
          ) : null}
        </div>
        <div>
          <label
            htmlFor="checkout-companyName"
            className="mb-1 block text-sm font-semibold text-gray-800"
          >
            {t("contact.companyName")}
          </label>
          <input
            id="checkout-companyName"
            type="text"
            readOnly
            value={manualAddress.companyName}
            placeholder={
              isLookingUpVat
                ? t("contact.vatLookupLoading")
                : t("contact.companyNameAuto")
            }
            className={lockedInputClass}
            aria-busy={isLookingUpVat}
          />
        </div>
        {!isLoggedIn ? (
          <div>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red"
              placeholder={t("checkout.placeholder.email")}
              autoComplete="email"
              required
            />
            <p className="mt-1 text-xs text-gray-600">{t("checkout.guestEmailHint")}</p>
          </div>
        ) : null}
        {hasSavedAddresses ? (
          <p className="text-my-red font-semibold text-sm flex items-center gap-2">
            <span>•</span> {t("checkout.selectAddress")}
          </p>
        ) : null}
        {useManualAddressForm ? (
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
        ) : (
          <p className="text-sm text-gray-600">{t("checkout.address.companyDefaultHint")}</p>
        )}
        {hasSavedAddresses ? (
          <p className="text-sm">
            {addressType === "company" ? (
              <button
                type="button"
                onClick={() => setAddressType("another")}
                className="font-semibold text-my-red hover:underline"
              >
                {t("checkout.useAnotherAddress")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAddressType("company");
                  setSelectedAddressId(defaultShippingAddress?.id ?? null);
                }}
                className="font-semibold text-my-red hover:underline"
              >
                {t("checkout.useSavedAddress")}
              </button>
            )}
          </p>
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
