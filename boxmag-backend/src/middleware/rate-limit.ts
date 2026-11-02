import type { Request } from "express";
import rateLimit from "express-rate-limit";
import { isRequestAuthenticatedAsAdmin } from "./require-admin";

/** Session/profile reads are not credential guessing — keep them unthrottled. */
const AUTH_UNLIMITED_PATHS = new Set(["/profile", "/logout"]);

function isReadOnlyRequest(req: Request): boolean {
  return req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS";
}

/** Login / register / password-adjacent endpoints. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => AUTH_UNLIMITED_PATHS.has(req.path),
  message: {
    ok: false,
    message: "Too many requests. Try again later.",
  },
});

/**
 * Contact submissions. The Next.js `/api/contact` route forwards every message
 * server-to-server, so all of them arrive from the frontend server's IP; it
 * rate-limits per real client itself and authenticates with the admin
 * credential, which exempts it here. Direct (unauthenticated) posts stay limited.
 */
export const contactSubmitRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isRequestAuthenticatedAsAdmin(req),
  message: {
    ok: false,
    message: "Too many requests. Try again later.",
  },
});

/**
 * Public B2B order creation: accepts a large body, writes to MinIO and sends
 * emails, so it gets a tight per-IP budget.
 */
export const orderCreateRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    message: "Too many orders submitted. Try again later.",
  },
});

/** Public forms that send email (newsletter). */
export const publicFormRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isReadOnlyRequest(req) || isRequestAuthenticatedAsAdmin(req),
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
