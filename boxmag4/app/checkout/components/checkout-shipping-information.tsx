"use client";

import Link from "next/link";
import { useMemo, type Dispatch, type SetStateAction } from "react";
import { useLanguage } from "../../i18n/language-context";
import {
  CheckoutAddressMap,
  type MapAddressInput,
} from "./checkout-address-map";

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
}: CheckoutShippingInformationProps) {
  const { t } = useLanguage();
  const hasSavedAddresses = addresses.length > 0;
  const useManualAddressForm = !hasSavedAddresses || addressType === "another";

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
          <div className="h-40 w-full shrink-0 overflow-hidden sm:h-auto sm:min-h-[160px] sm:w-64">
            <CheckoutAddressMap address={mapAddress} />
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
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
