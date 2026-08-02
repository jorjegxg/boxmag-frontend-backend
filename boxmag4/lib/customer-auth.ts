import { clearVatCompanyCache } from "./vat-company";

export const AUTH_STORAGE_KEY = "boxmag.auth.loggedIn";
export const AUTH_EMAIL_STORAGE_KEY = "boxmag.auth.email";
export const AUTH_CHANGED_EVENT = "boxmag-auth-changed";

/**
 * Clears customer auth localStorage keys, VAT→company cache, and notifies
 * listeners (header, contact, etc.). Does not call the backend logout endpoint.
 */
export function clearCustomerAuthLocalState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_EMAIL_STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
  clearVatCompanyCache();
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}
