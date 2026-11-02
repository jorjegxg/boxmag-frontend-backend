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
 * Public forms that send email (contact, newsletter). Admin traffic (inbox,
 * replies) and server-to-server calls carrying admin credentials are exempt,
 * and reads never count.
 */
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

/** Public B2B order creation (stores attachments, emails the given address). */
export const orderCreateRateLimiter = rateLimit({
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
