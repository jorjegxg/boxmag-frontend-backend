"use client";

import { FaShoppingCart } from "react-icons/fa";

type Shop2Row = {
  itemNo: string;
  name: string;
  colour: string;
  grammage: number;
  qualityCardboard: string;
  dinFormat: string;
  l: number;
  w: number;
  h: number;
  bundlePacking: number;
  qty: number;
  palletPcs: number;
};

export function Shop2ProductsTable() {
  const rows: Shop2Row[] = [
    {
      itemNo: "M1-EV",
      name: "M1-EV CARDBOARD ENVELOPE 255x220",
      colour: "Brown",
      grammage: 325,
      qualityCardboard: "1.20-21 E",
      dinFormat: "A6",
      l: 255,
      w: 220,
      h: 70,
      bundlePacking: 25,
      qty: 25,
      palletPcs: 5000,
    },
    {
      itemNo: "M2-EV",
      name: "M2-EV CARDBOARD ENVELOPE 250x165",
      colour: "Brown",
      grammage: 325,
      qualityCardboard: "1.20-21 E",
      dinFormat: "A5",
      l: 250,
      w: 165,
      h: 70,
      bundlePacking: 25,
      qty: 25,
      palletPcs: 6000,
    },
    {
      itemNo: "M3-EV",
      name: "M3-EV CARDBOARD ENVELOPE 282x205",
      colour: "Brown",
      grammage: 325,
      qualityCardboard: "1.20-21 E",
      dinFormat: "A5",
      l: 282,
      w: 205,
      h: 70,
      bundlePacking: 25,
      qty: 25,
      palletPcs: 3000,
    },
    {
      itemNo: "M4-EV",
      name: "M4-EV CARDBOARD ENVELOPE 312x250",
      colour: "Brown",
      grammage: 325,
      qualityCardboard: "1.20-21 E",
      dinFormat: "A5",
      l: 312,
      w: 250,
      h: 70,
      bundlePacking: 25,
      qty: 25,
      palletPcs: 3000,
    },
    {
      itemNo: "M5-EV",
      name: "M4-EV CARDBOARD ENVELOPE 350x250",
      colour: "Brown",
      grammage: 325,
      qualityCardboard: "1.20-21 E",
      dinFormat: "A5",
      l: 350,
      w: 250,
      h: 70,
      bundlePacking: 25,
      qty: 25,
      palletPcs: 2400,
    },
  ];

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
            <tr key={row.itemNo} className="text-black">
              <td className="border border-[#d9d9d9] px-2 py-3">{row.itemNo}</td>
              <td className="border border-[#d9d9d9] px-2 py-3 font-semibold text-[11px] leading-tight">
                {row.name}
              </td>
              <td className="border border-[#d9d9d9] px-2 py-3">{row.colour}</td>
              <td className="border border-[#d9d9d9] px-2 py-3 text-center">{row.grammage}</td>
              <td className="border border-[#d9d9d9] px-2 py-3 text-center">{row.qualityCardboard}</td>
              <td className="border border-[#d9d9d9] px-2 py-3 text-center">{row.dinFormat}</td>
              <td className="border border-[#d9d9d9] px-2 py-3 text-center">{row.l}</td>
              <td className="border border-[#d9d9d9] px-2 py-3 text-center">{row.w}</td>
              <td className="border border-[#d9d9d9] px-2 py-3 text-center">{row.h}</td>
              <td className="border border-[#d9d9d9] px-2 py-3 text-center">{row.bundlePacking}</td>
              {[1, 2, 3, 4].map((idx) => (
                <td key={idx} className="border border-[#d9d9d9] px-2 py-3 text-center whitespace-nowrap">
                  <div>0.84 €</div>
                  <div className="font-semibold">1.00 €</div>
                </td>
              ))}
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
