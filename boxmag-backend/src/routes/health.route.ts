import { Router } from "express";
import { env } from "../config/env";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    ok: true,
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
    database: {
      host: env.dbHost,
      port: env.dbPort,
      name: env.dbName,
      user: env.dbUser,
    },
  });
});

