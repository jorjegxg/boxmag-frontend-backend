import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { buildCorsOptions } from "./config/cors";
import { JSON_BODY_LIMIT } from "./config/uploads";
import { healthRouter } from "./routes/health.route";
import { boxTypesRouter } from "./routes/box-types.route";
import { ordersRouter } from "./routes/orders.route";
import { newsletterRouter } from "./routes/newsletter.route";
import { authRouter } from "./routes/auth.route";
import { addressesRouter } from "./routes/addresses.route";
import { shippingMethodsRouter } from "./routes/shipping-methods.route";
import {
  paymentsRouter,
  stripeWebhookHandler,
} from "./routes/payments.route";
import { exchangeRateRouter } from "./routes/exchange-rate.route";

export const app = express();

app.use(cors(buildCorsOptions()));

// Stripe webhook must be registered BEFORE express.json() so that the raw
// request body is available for signature verification.
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler,
);

app.use(express.json({ limit: JSON_BODY_LIMIT }));

app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  const isPayloadTooLarge =
    typeof err === "object" &&
    err !== null &&
    (("type" in err && err.type === "entity.too.large") ||
      ("status" in err && err.status === 413));

  if (isPayloadTooLarge) {
    res.status(413).json({
      ok: false,
      message:
        "Request payload is too large. Reduce the attachment size and try again.",
    });
    return;
  }

  next(err);
});

app.get("/", (_req, res) => {
  res.json({
    service: "boxmag-backend",
    status: "ok",
  });
});

app.use("/api/health", healthRouter);
app.use("/api/box-types", boxTypesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/addresses", addressesRouter);
app.use("/api/newsletter", newsletterRouter);
app.use("/api/auth", authRouter);
app.use("/api/shipping-methods", shippingMethodsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/exchange-rate", exchangeRateRouter);

