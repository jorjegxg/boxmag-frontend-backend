import cors from "cors";
import express from "express";
import { env } from "./config/env";
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

export const app = express();

app.use(
  cors({
    origin:
      env.corsOrigins === "*"
        ? true
        : env.corsOrigins.length === 1
          ? env.corsOrigins[0]
          : env.corsOrigins,
  })
);

// Stripe webhook must be registered BEFORE express.json() so that the raw
// request body is available for signature verification.
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler,
);

app.use(express.json());

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

