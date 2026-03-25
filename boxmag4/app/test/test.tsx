"use client";

import { useState } from "react";

const options = ["Card", "Cash", "Transfer"];

export default function RadioButtons() {
  const [value, setValue] = useState("Card");

  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <label key={opt} className="cursor-pointer">
          <input
            type="radio"
            name="payment"
            value={opt}
            checked={value === opt}
            onChange={() => setValue(opt)}
            className="hidden"
          />

          <div
            className={`px-4 py-2 rounded-lg border
              ${
                value === opt
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-gray-300"
              }
            `}
          >
            {opt}
          </div>
        </label>
      ))}
    </div>
  );
}
