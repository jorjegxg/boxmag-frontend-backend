import rateLimit from "express-rate-limit";

/** Login / register / password-adjacent endpoints. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    message: "Too many requests. Try again later.",
  },
});

/** Public forms that send email (contact, newsletter). */
export const publicFormRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    message: "Too many requests. Try again later.",
  },
});

/** Checkout session creation — softer limit, still blocks abuse. */
export const checkoutRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    message: "Too many checkout attempts. Try again later.",
  },
});
