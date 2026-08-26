import Link from "next/link";
import { blockNegativeInput, sanitizeNumericString } from "../../utils/number-input";

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-my-red w-full flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-3 sm:pl-8 sm:pr-4 sm:py-4 text-my-white">
      <span className="font-bold text-base sm:text-lg flex items-center gap-2">
        {title}
      </span>
      {subtitle ? (
        <span className="text-sm sm:text-base">{subtitle}</span>
      ) : null}
    </div>
  );
}

export function Field({
  label,
  placeholder,
  value,
  onChange,
  numeric = false,
  min = 0,
  step,
  allowDecimal = true,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  numeric?: boolean;
  min?: number;
  step?: number | string;
  allowDecimal?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-gray-800">{label}</span>
      <input
        type={numeric ? "number" : "text"}
        min={numeric ? min : undefined}
        step={numeric ? step : undefined}
        placeholder={placeholder}
        value={value}
        onBeforeInput={
          numeric ? (event) => blockNegativeInput(event, { allowDecimal }) : undefined
        }
        onChange={(event) =>
          onChange(
            numeric
              ? sanitizeNumericString(event.target.value, { allowDecimal })
              : event.target.value
          )
        }
        className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red"
      />
    </label>
  );
}

export function AdminBreadcrumb({ current }: { current?: string }) {
  return (
    <section className="w-full bg-white px-6 lg:px-20 pt-6">
      <div className="max-w-7xl mx-auto text-xs lg:text-sm text-gray-500 uppercase tracking-wide">
        <Link href="/" className="hover:underline">
          Acasă
        </Link>{" "}
        <span className="mx-2">→</span>
        {current ? (
          <>
            <Link href="/admin" className="hover:underline text-gray-700">
              Admin
            </Link>{" "}
            <span className="mx-2">→</span>
            <span className="text-gray-700 font-semibold">{current}</span>
          </>
        ) : (
          <span className="text-gray-700 font-semibold">Admin</span>
        )}
      </div>
    </section>
  );
}
