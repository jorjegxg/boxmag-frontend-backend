"use client";

import { useEffect, useMemo, useState } from "react";
import { FaShoppingCart } from "react-icons/fa";

type Shop2Row = {
  id: number;
  itemNo: string;
  name: string;
  colour?: string;
  grammage?: number;
  qualityCardboard: string;
  dinFormat?: string;
  l: number;
  w: number;
  h: number;
  bundlePacking: number;
  qty: number;
  palletPcs: number;
  prices: Array<{
    id: number;
    name: string;
    withoutTax: number;
    withTax: number;
  }>;
};

export function Shop2ProductsTable() {
  const [rows, setRows] = useState<Shop2Row[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const backendBaseUrl = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
    if (!value) return "http://localhost:3005";
    return value.endsWith("/") ? value.slice(0, -1) : value;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadRows = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(`${backendBaseUrl}/api/box-types/9/products`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          ok?: boolean;
          message?: string;
          data?: Array<{
            id: number;
            itemNo: string;
            productName: string;
            internalDimensionsMM?: { l: number; w: number; h: number };
            qualityCardboard?: string;
            amountQtyInPcs?: number;
            palletPcs?: number;
            prices?: Array<{ id: number; name: string; withoutTax: number; withTax: number }>;
          }>;
        };
        if (!response.ok || payload.ok !== true || !Array.isArray(payload.data)) {
          throw new Error(payload.message ?? "Failed to load products");
        }
        if (cancelled) return;

        setRows(
          payload.data.map((row) => ({
            id: row.id,
            itemNo: String(row.itemNo ?? ""),
            name: String(row.productName ?? ""),
            colour: "Brown",
            grammage: 325,
            qualityCardboard: String(row.qualityCardboard ?? "-"),
            dinFormat: "-",
            l: Number(row.internalDimensionsMM?.l ?? 0),
            w: Number(row.internalDimensionsMM?.w ?? 0),
            h: Number(row.internalDimensionsMM?.h ?? 0),
            bundlePacking: Number(row.amountQtyInPcs ?? 0),
            qty: Number(row.amountQtyInPcs ?? 0),
            palletPcs: Number(row.palletPcs ?? 0),
            prices: Array.isArray(row.prices) ? row.prices : [],
          })),
        );
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "Failed to load products");
        setRows([]);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadRows();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [backendBaseUrl]);

  const getPriceByName = (prices: Shop2Row["prices"], name: string) =>
    prices.find((price) => String(price.name).toLowerCase() === name.toLowerCase());

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#d6d6d6] bg-[#f2f2f2] px-4 py-6 text-sm text-gray-500">
        Loading products...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-[#d6d6d6] bg-[#f2f2f2] px-4 py-6 text-sm text-red-600">
        {loadError}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#d6d6d6] bg-[#f2f2f2]">
      <table className="min-w-[1250px] w-full text-sm border-collapse">
        <thead>
          <tr className="bg-[#f0ab3c] text-black">
            <th rowSpan={2} className="border border-[#d9d9d9] px-2 py-2 font-semibold text-left">
              Item No
            </th>
            <th rowSpan={2} className="border border-[#d9d9d9] px-2 py-2 font-semibold text-left">
              Name
            </th>
            <th rowSpan={2} className="border border-[#d9d9d9] px-2 py-2 font-semibold text-left">
              Colour
            </th>
            <th rowSpan={2} className="border border-[#d9d9d9] px-2 py-2 font-semibold text-center">
              Grammage
              <br />
              (gr/sqm)
            </th>
            <th rowSpan={2} className="border border-[#d9d9d9] px-2 py-2 font-semibold text-center leading-tight">
              Quality
              <br />
              Cardboard
            </th>
            <th rowSpan={2} className="border border-[#d9d9d9] px-2 py-2 font-semibold text-center">
              DIN
              <br />
              Formats
            </th>
            <th colSpan={3} className="border border-[#d9d9d9] px-2 py-2 font-semibold text-center leading-tight">
              Outer Size
              <br />
              In mm
            </th>
            <th rowSpan={2} className="border border-[#d9d9d9] px-2 py-2 font-semibold text-center leading-tight">
              Bundle/
              <br />
              Packing
            </th>
            <th colSpan={4} className="border border-[#d9d9d9] px-2 py-2 font-semibold text-center leading-tight">
              Price Without Tax
              <br />
              / With Tax
            </th>
            <th rowSpan={2} className="border border-[#d9d9d9] px-2 py-2 font-semibold text-center leading-tight">
              Amount
              <br />
              QTY in pcs
            </th>
            <th rowSpan={2} className="border border-[#d9d9d9] px-2 py-2 font-semibold text-center leading-tight">
              Pallet/
              <br />
              pcs
            </th>
          </tr>
          <tr className="bg-[#f0ab3c] text-black">
            <th className="border border-[#d9d9d9] px-2 py-1 text-center">L</th>
            <th className="border border-[#d9d9d9] px-2 py-1 text-center">W</th>
            <th className="border border-[#d9d9d9] px-2 py-1 text-center">H</th>
            <th className="border border-[#d9d9d9] px-2 py-1 text-center">from 1 pcs</th>
            <th className="border border-[#d9d9d9] px-2 py-1 text-center">&lt; 100 pcs</th>
            <th className="border border-[#d9d9d9] px-2 py-1 text-center">&lt; 300 pcs</th>
            <th className="border border-[#d9d9d9] px-2 py-1 text-center">&lt; 500 pcs</th>
          </tr>
        </thead>
        <tbody className="bg-[#f2f2f2]">
          {rows.map((row) => (
            <tr key={row.id} className="text-black">
              <td className="border border-[#d9d9d9] px-2 py-3">{row.itemNo}</td>
              <td className="border border-[#d9d9d9] px-2 py-3 font-semibold text-[11px] leading-tight">
                {row.name}
              </td>
              <td className="border border-[#d9d9d9] px-2 py-3">{row.colour ?? "-"}</td>
              <td className="border border-[#d9d9d9] px-2 py-3 text-center">{row.grammage ?? "-"}</td>
              <td className="border border-[#d9d9d9] px-2 py-3 text-center">{row.qualityCardboard}</td>
              <td className="border border-[#d9d9d9] px-2 py-3 text-center">{row.dinFormat ?? "-"}</td>
              <td className="border border-[#d9d9d9] px-2 py-3 text-center">{row.l}</td>
              <td className="border border-[#d9d9d9] px-2 py-3 text-center">{row.w}</td>
              <td className="border border-[#d9d9d9] px-2 py-3 text-center">{row.h}</td>
              <td className="border border-[#d9d9d9] px-2 py-3 text-center">{row.bundlePacking}</td>
              {["100", "300", "500", "Pallet"].map((priceName) => {
                const price = getPriceByName(row.prices, priceName);
                return (
                  <td
                    key={priceName}
                    className="border border-[#d9d9d9] px-2 py-3 text-center whitespace-nowrap"
                  >
                    <div>{price ? `${price.withoutTax.toFixed(2)} €` : "-"}</div>
                    <div className="font-semibold">{price ? `${price.withTax.toFixed(2)} €` : "-"}</div>
                  </td>
                );
              })}
              <td className="border border-[#d9d9d9] px-2 py-2">
                <div className="flex items-center justify-center gap-2">
                  <div className="flex flex-col text-[11px] text-[#b8b8b8] leading-none">
                    <span>▲</span>
                    <span>▼</span>
                  </div>
                  <span>{row.qty}</span>
                  <button
                    className="h-6 w-6 rounded-md bg-[#f0ab3c] flex items-center justify-center"
                    aria-label="Add to cart"
                  >
                    <FaShoppingCart className="text-[11px]" />
                  </button>
                </div>
              </td>
              <td className="border border-[#d9d9d9] px-2 py-3 text-center">
                <span className="inline-block rounded-md bg-[#ef6b56] px-3 py-1 text-white font-semibold">
                  +{row.palletPcs}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
