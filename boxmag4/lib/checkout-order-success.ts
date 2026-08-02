export type CheckoutRegistrationPrefill = {
  email: string;
  firstName?: string;
  surname?: string;
  companyName?: string;
  vatNumber?: string;
  phone?: string;
};

export function buildRegistrationUrlFromCheckout(
  payload: CheckoutRegistrationPrefill,
): string {
  const params = new URLSearchParams();
  params.set("email", payload.email);
  if (payload.firstName) params.set("firstName", payload.firstName);
  if (payload.surname) params.set("surname", payload.surname);
  if (payload.companyName) params.set("companyName", payload.companyName);
  if (payload.vatNumber) params.set("vatNumber", payload.vatNumber);
  if (payload.phone) params.set("phone", payload.phone);
  params.set("returnTo", "/account#orders");
  params.set("from", "checkout");
  return `/registration?${params.toString()}`;
}
