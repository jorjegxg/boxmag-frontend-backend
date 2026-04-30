"use client";

import Image from "next/image";
import { Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "../i18n/language-context";

const priceBreaks = [
  { qty: "> 1 szt.", gross: "1,16 euro", net: "0,96 euro" },
  { qty: "> 600 szt.", gross: "1,03 euro", net: "0,85 euro" },
  { qty: "> 1200 szt.", gross: "0,98 euro", net: "0,81 euro" },
  { qty: "> 1800 szt.", gross: "0,94 euro", net: "0,78 euro" },
  { qty: "Palet", gross: "0,87 euro", net: "0,72 euro" },
];
const BOXES_PER_PALLET = 9000;

export default function ProdusDemoPage() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(50);

  const productName = searchParams.get("productName")?.trim() || "Cutie poștală plată GBKA5";
  const itemNo = searchParams.get("itemNo")?.trim() || "GBKA5";
  const size = searchParams.get("size")?.trim() || "230x160x20";
  const imageFromQuery = searchParams.get("image")?.trim() || "";
  const grossPrice = Number(searchParams.get("priceWithTax"));
  const netPrice = Number(searchParams.get("priceWithoutTax"));

  const displayGrossPrice = Number.isFinite(grossPrice) ? `${grossPrice.toFixed(2)} euro` : "58,00 euro";
  const displayNetPrice = Number.isFinite(netPrice) ? `${netPrice.toFixed(2)} euro fără TVA` : "48,00 euro fără TVA";

  const galleryWithProduct = useMemo(
    () => [imageFromQuery || "/placeholders/box4.png"],
    [imageFromQuery]
  );

  return (
    <main className="w-full bg-[#f8f8f8] px-4 py-8 lg:px-12">
      <section className="mx-auto max-w-7xl rounded-3xl border border-black/10 bg-white p-4 shadow-sm lg:p-8">
        <p className="mb-5 text-xs text-gray-500 lg:text-sm">
          {t("productDemo.breadcrumbStore")} {" > "} {t("productDemo.breadcrumbCategory")} {" > "}{" "}
          {productName} {size}
        </p>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr_260px]">
          <div>
            <div className="relative flex h-[320px] w-[423px] max-w-full items-center justify-center rounded-2xl border border-gray-200 bg-[#f6f1e8] p-6">
              <Image
                src={galleryWithProduct[selectedImage]}
                alt={productName}
                width={430}
                height={320}
                className="h-full w-full max-h-full max-w-full object-contain"
                priority
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {galleryWithProduct.map((src, index) => (
                <button
                  key={src}
                  onClick={() => setSelectedImage(index)}
                  className={`rounded-xl border p-1 transition ${
                    selectedImage === index
                      ? "border-my-yellow ring-2 ring-my-yellow/40"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  aria-label={`${t("productDemo.imageAria")} ${index + 1}`}
                >
                  <Image
                    src={src}
                    alt={`Thumbnail ${index + 1}`}
                    width={72}
                    height={72}
                    className="h-[58px] w-[72px] rounded-lg object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-extrabold leading-tight text-black">
              {productName}
              <br />
              {size}
            </h1>

            <p className="mt-2 text-sm text-gray-700">
              <span className="font-semibold text-green-700">● {t("productDemo.inStore")}</span> |{" "}
              {t("productDemo.reference")}:
              <span className="font-semibold"> {itemNo}</span>
            </p>

            <div className="mt-5 border-b border-gray-200 pb-5">
              <p className="text-5xl font-extrabold text-my-yellow">{displayGrossPrice}</p>
              <p className="text-lg text-gray-500">{displayNetPrice}</p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-700">{t("productDemo.quantity")}</p>
                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <button
                    onClick={() => setQuantity((prev) => Math.max(50, prev - 50))}
                    className="rounded-md p-1 text-gray-600 hover:bg-gray-200"
                    aria-label={t("productDemo.decreaseQuantityAria")}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-lg font-bold">{quantity}</span>
                  <button
                    onClick={() => setQuantity((prev) => prev + 50)}
                    className="rounded-md p-1 text-gray-600 hover:bg-gray-200"
                    aria-label={t("productDemo.increaseQuantityAria")}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-gray-700">{t("productDemo.addPallet")}</p>
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => prev + BOXES_PER_PALLET)}
                  className="w-full rounded-xl bg-black px-4 py-3 text-base font-bold text-white hover:bg-black/90"
                >
                  + {BOXES_PER_PALLET}
                </button>
              </div>
            </div>

            <button className="mt-4 w-full rounded-xl bg-my-yellow px-5 py-4 text-lg font-bold text-black hover:brightness-95">
              {t("productDemo.addToCart")}
            </button>

            <p className="mt-3 text-sm text-gray-500">
              {t("productDemo.minOrderQty")} 50.
            </p>
          </div>

          <aside className="rounded-2xl border border-gray-200 bg-[#f4f4f4] p-3">
            <div className="mb-2 grid grid-cols-[1fr_1fr] gap-2 text-xs font-semibold text-gray-600">
              <span className="rounded-md bg-gray-200 px-2 py-1 text-center">
                {t("productDemo.quantity")}
              </span>
              <span className="rounded-md bg-gray-200 px-2 py-1 text-center">
                {t("productDemo.priceWithWithoutTax")}
              </span>
            </div>

            <div className="space-y-2">
              {priceBreaks.map((item) => (
                <div
                  key={item.qty}
                  className="grid grid-cols-[1fr_1fr] gap-2 rounded-md bg-white p-2 text-sm"
                >
                  <span className="font-semibold text-gray-700">{item.qty}</span>
                  <span className="text-right">
                    <strong>{item.gross}</strong>
                    <br />
                    <span className="text-gray-500">{item.net}</span>
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
