/** Public and dev-only email addresses — values come from root `.env` via next.config. */
export const siteEmails = {
  info: process.env.NEXT_PUBLIC_INFO_EMAIL?.trim() ?? "",
  b2b: process.env.NEXT_PUBLIC_B2B_EMAIL?.trim() ?? "",
  devDemoCustomer: process.env.DEV_DEMO_CUSTOMER_EMAIL?.trim() ?? "",
  devAutofill: process.env.DEV_AUTOFILL_EMAIL?.trim() ?? "",
} as const;
