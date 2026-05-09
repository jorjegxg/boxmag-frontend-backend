import Stripe from "stripe";
import { env } from "../config/env";

let cachedClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(env.stripeSecretKey);
}

export function getStripeClient(): Stripe {
  if (!env.stripeSecretKey) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY in the .env file.",
    );
  }
  if (!cachedClient) {
    cachedClient = new Stripe(env.stripeSecretKey);
  }
  return cachedClient;
}
