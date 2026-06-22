import { Router } from "express";
import { getEurRonRate } from "../services/exchange-rate.service";

export const exchangeRateRouter = Router();

exchangeRateRouter.get("/eur-ron", async (_req, res) => {
  try {
    const data = await getEurRonRate();
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.json({
      ok: true,
      data,
    });
  } catch (error) {
    console.error("Failed to load EUR/RON exchange rate", error);
    res.status(503).json({
      ok: false,
      message: "Failed to load EUR/RON exchange rate",
    });
  }
});
