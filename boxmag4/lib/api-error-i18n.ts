/**
 * Backend and Next API routes answer with English `message` strings. Customer
 * pages must never show those raw: map the known ones to translation keys and
 * fall back to a page-specific key for everything else.
 */

type Translate = (key: string) => string;

const EXACT_MESSAGE_KEYS: Record<string, string> = {
  // auth
  "Invalid email or password": "account.error.invalidCredentials",
  "Email and password are required": "account.error.enterCredentials",
  "Please verify your email before signing in": "apiError.emailNotVerified",
  "Your account is inactive": "apiError.accountInactive",
  "An account with this email already exists": "apiError.emailExists",
  "Invalid email address": "apiError.invalidEmail",
  "Please enter a valid email address.": "apiError.invalidEmail",
  "Reset link is invalid or has already been used.": "resetPassword.expired",
  "Reset link has expired. Please request a new one.": "resetPassword.expired",
  "Reset token is required": "resetPassword.invalidLink",
  "Password must be at least 6 characters": "resetPassword.tooShort",
  "Authentication required.": "account.sessionExpired",
  "You do not have access to this resource.": "apiError.forbidden",
  "User not found": "apiError.userNotFound",
  // rate limiting
  "Too many requests. Try again later.": "apiError.tooManyRequests",
  "Too many checkout attempts. Try again later.": "apiError.tooManyRequests",
  // account / orders
  "Address not found": "apiError.addressNotFound",
  "Order not found": "apiError.orderNotFound",
  "Order attachment not found": "apiError.attachmentNotFound",
  "Dimensions must be at least 1 mm": "apiError.dimensionsMin",
  // checkout
  "Cart is empty.": "checkout.error.cartEmpty",
  "Missing session id": "apiError.missingPaymentSession",
  // contact (Next /api/contact)
  "Terms must be accepted.": "contact.error.acceptTerms",
  "Unable to send your message right now.": "contact.error.sendFailedRetry",
  "Invalid VAT number. Please provide a valid VAT for the selected country (e.g. RO12345678).":
    "contact.error.vatInvalid",
};

const PREFIX_MESSAGE_KEYS: Array<[prefix: string, key: string]> = [
  ["Minimum order quantity is", "checkout.error.minOrderQty"],
  ["Unknown or unpriced product", "apiError.productUnavailable"],
  ["Unknown or inactive shipping method", "apiError.shippingUnavailable"],
  ["Attachment is too large", "apiError.attachmentTooLarge"],
  ["Total attachments are too large", "apiError.attachmentTooLarge"],
  ["File \"", "apiError.attachmentTooLarge"],
  ["You can upload up to", "apiError.tooManyFiles"],
  ["Missing required field", "apiError.missingFields"],
  ["Stripe is not configured", "apiError.serviceUnavailable"],
  ["Stripe error", "apiError.paymentProvider"],
  ["Email service is not configured", "apiError.serviceUnavailable"],
  ["Email transport is not configured", "apiError.serviceUnavailable"],
  ["SMTP is not configured", "apiError.serviceUnavailable"],
];

/** Translation key for a known API message, or null when unknown. */
export function apiErrorKey(message: string | null | undefined): string | null {
  const trimmed = message?.trim();
  if (!trimmed) return null;
  const exact = EXACT_MESSAGE_KEYS[trimmed];
  if (exact) return exact;
  for (const [prefix, key] of PREFIX_MESSAGE_KEYS) {
    if (trimmed.startsWith(prefix)) return key;
  }
  return null;
}

/** Localized text for an API error message; unknown messages use `fallbackKey`. */
export function localizeApiError(
  message: string | null | undefined,
  t: Translate,
  fallbackKey: string,
): string {
  return t(apiErrorKey(message) ?? fallbackKey);
}

/** Every key this module can return, for locale coverage tests. */
export const API_ERROR_KEYS: readonly string[] = Array.from(
  new Set([
    ...Object.values(EXACT_MESSAGE_KEYS),
    ...PREFIX_MESSAGE_KEYS.map(([, key]) => key),
  ]),
);
