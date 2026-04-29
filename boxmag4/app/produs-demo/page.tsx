"use client";

import Image from "next/image";
import { Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";

const galleryImages = [
  "/b2b/boxes/open-box.png",
  "/b2b/boxes/box.png",
  "/b2b/boxes/sqashed.png",
  "/b2b/boxes/box-double-strip.png",
  "/b2b/boxes/hand-holdign-box.png",
];

const priceBreaks = [
  { qty: "> 1 szt.", gross: "1,16 euro", net: "0,96 euro" },
  { qty: "> 600 szt.", gross: "1,03 euro", net: "0,85 euro" },
  { qty: "> 1200 szt.", gross: "0,98 euro", net: "0,81 euro" },
  { qty: "> 1800 szt.", gross: "0,94 euro", net: "0,78 euro" },
  { qty: "Palet", gross: "0,87 euro", net: "0,72 euro" },
];

export default function ProdusDemoPage() {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(50);

  const pallets = useMemo(() => Math.max(1, Math.round(quantity / 50)), [quantity]);

  return (
    <main className="w-full bg-[#f8f8f8] px-4 py-8 lg:px-12">
      <section className="mx-auto max-w-7xl rounded-3xl border border-black/10 bg-white p-4 shadow-sm lg:p-8">
        <p className="mb-5 text-xs text-gray-500 lg:text-sm">
          Boxmarket Angro de Ambalaje {" > "} Cutii de carton si cutii {" > "}{" "}
          Cutie poștală plată GBKA5 230x160x20
        </p>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr_260px]">
          <div>
            <div className="relative flex h-[320px] w-[423px] max-w-full items-center justify-center rounded-2xl border border-gray-200 bg-[#f6f1e8] p-6">
              <Image
                src={galleryImages[selectedImage]}
                alt="Cutie poștală"
                width={430}
                height={320}
                className="h-full w-full max-h-full max-w-full object-contain"
                priority
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {galleryImages.map((src, index) => (
                <button
                  key={src}
                  onClick={() => setSelectedImage(index)}
                  className={`rounded-xl border p-1 transition ${
                    selectedImage === index
                      ? "border-my-yellow ring-2 ring-my-yellow/40"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  aria-label={`Imagine produs ${index + 1}`}
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
              Cutie poștală plată GBKA5
              <br />
              230x160x20
            </h1>

            <p className="mt-2 text-sm text-gray-700">
              <span className="font-semibold text-green-700">● În magazin</span> | Referință:
              <span className="font-semibold"> GBKA5</span>
            </p>

            <div className="mt-5 border-b border-gray-200 pb-5">
              <p className="text-5xl font-extrabold text-my-yellow">58,00 euro</p>
              <p className="text-lg text-gray-500">48,00 euro fără TVA</p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-700">Cantitate</p>
                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <button
                    onClick={() => setQuantity((prev) => Math.max(50, prev - 50))}
                    className="rounded-md p-1 text-gray-600 hover:bg-gray-200"
                    aria-label="Scade cantitatea"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-lg font-bold">{quantity}</span>
                  <button
                    onClick={() => setQuantity((prev) => prev + 50)}
                    className="rounded-md p-1 text-gray-600 hover:bg-gray-200"
                    aria-label="Crește cantitatea"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-gray-700">Adăugați palet</p>
                <button className="w-full rounded-xl bg-black px-4 py-3 text-base font-bold text-white hover:bg-black/90">
                  + {pallets * 9000}
                </button>
              </div>
            </div>

            <button className="mt-4 w-full rounded-xl bg-my-yellow px-5 py-4 text-lg font-bold text-black hover:brightness-95">
              Adaugă în coș
            </button>

            <p className="mt-3 text-sm text-gray-500">
              Cantitatea minimă de comandă pentru acest produs: 50.
            </p>
          </div>

          <aside className="rounded-2xl border border-gray-200 bg-[#f4f4f4] p-3">
            <div className="mb-2 grid grid-cols-[1fr_1fr] gap-2 text-xs font-semibold text-gray-600">
              <span className="rounded-md bg-gray-200 px-2 py-1 text-center">Cantitate</span>
              <span className="rounded-md bg-gray-200 px-2 py-1 text-center">
                Preț cu TVA/fără TVA
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
