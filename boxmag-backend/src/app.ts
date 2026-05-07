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

export const app = express();

app.use(
  cors({
    origin: env.corsOrigin === "*" ? true : env.corsOrigin,
  })
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

