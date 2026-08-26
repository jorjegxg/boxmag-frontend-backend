/**
 * Sign-aware numeric coercion helpers shared across routes.
 *
 * The per-route `toOptionalNumber` helpers only check `Number.isFinite`,
 * which lets negative values through to the database.
 * Use these whenever a field has a meaningful lower bound.
 */

/** Accepts a finite number (or numeric string) that is `>= 0`. */
export function toNonNegativeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

/** Accepts a value that floors to an integer strictly greater than zero. */
export function toPositiveInt(value: unknown): number | null {
  const parsed = toNonNegativeNumber(value);
  if (parsed == null) return null;
  const rounded = Math.floor(parsed);
  return rounded > 0 ? rounded : null;
}

/** True when `value` is a finite number `>= min`. Rejects `NaN` and `Infinity`. */
export function isNumberAtLeast(value: unknown, min: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min;
}
