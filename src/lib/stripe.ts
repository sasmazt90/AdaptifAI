import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2026-03-25.dahlia",
      appInfo: {
        name: "AdaptifAI",
        version: "0.1.0",
      },
    });
  }

  return stripeClient;
}

export function getStripeEnv(key: string) {
  return process.env[key]?.trim();
}

export const creditPacks = {
  starter: {
    credits: 250,
    name: "AdaptifAI Starter Credits",
    amount: 1900,
    envPriceKey: "STRIPE_PRICE_STARTER",
    envPaymentLinkKey: "STRIPE_PAYMENT_LINK_STARTER",
  },
  studio: {
    credits: 900,
    name: "AdaptifAI Studio Credits",
    amount: 4900,
    envPriceKey: "STRIPE_PRICE_STUDIO",
    envPaymentLinkKey: "STRIPE_PAYMENT_LINK_STUDIO",
  },
  scale: {
    credits: 3500,
    name: "AdaptifAI Scale Credits",
    amount: 14900,
    envPriceKey: "STRIPE_PRICE_SCALE",
    envPaymentLinkKey: "STRIPE_PAYMENT_LINK_SCALE",
  },
} as const;

export type CreditPackId = keyof typeof creditPacks;
