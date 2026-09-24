/** Localized box type name by slug (`boxTypes.<key>` in locales), falling back to the DB title. */
export function boxTypeTitle(
  t: (key: string) => string,
  key: string | undefined | null,
  fallback: string,
): string {
  if (!key) return fallback;
  const translationKey = `boxTypes.${key}`;
  const translated = t(translationKey);
  return translated === translationKey ? fallback : translated;
}
