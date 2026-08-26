import type { FormEvent } from "react";

type NumericInputOptions = {
  allowDecimal?: boolean;
};

/**
 * `onBeforeInput` handler that stops sign/exponent characters from ever
 * reaching a numeric input.
 *
 * This runs before the character lands in the field, which matters because
 * `<input type="number">` reports `event.target.value === ""` while the field
 * visually holds an invalid value such as "-". An `onChange` handler therefore
 * never sees the "-" and cannot strip it.
 */
export function blockNegativeInput(
  event: FormEvent<HTMLInputElement>,
  { allowDecimal = true }: NumericInputOptions = {}
): void {
  const data = (event.nativeEvent as InputEvent).data;
  if (!data) return;

  const forbidden = allowDecimal ? /[^0-9.]/ : /[^0-9]/;
  if (forbidden.test(data)) event.preventDefault();
}

/**
 * Safety net for `onChange`: drops every character that is not a digit (or a
 * single decimal point). Covers autofill and programmatic writes that bypass
 * `onBeforeInput`.
 */
export function sanitizeNumericString(
  raw: string,
  { allowDecimal = true }: NumericInputOptions = {}
): string {
  if (!allowDecimal) return raw.replace(/[^0-9]/g, "");

  const cleaned = raw.replace(/[^0-9.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  return rest.length > 0 ? `${whole}.${rest.join("")}` : whole;
}

/** Parses a numeric string and clamps it to `min`, falling back to `min`. */
export function parseClampedNumber(raw: string, min: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(min, parsed) : min;
}
