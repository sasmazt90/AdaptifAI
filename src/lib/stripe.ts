import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia",
      appInfo: {
        name: "AdaptifAI",
        version: "0.1.0",
      },
    });
  }

  return stripeClient;
}

export const creditPacks = {
  starter: {
    credits: 100,
    name: "AdaptifAI Starter Credits",
    amount: 2900,
    envPriceKey: "STRIPE_PRICE_STARTER",
    envPaymentLinkKey: "STRIPE_PAYMENT_LINK_STARTER",
  },
  studio: {
    credits: 500,
    name: "AdaptifAI Studio Credits",
    amount: 9900,
    envPriceKey: "STRIPE_PRICE_STUDIO",
    envPaymentLinkKey: "STRIPE_PAYMENT_LINK_STUDIO",
  },
  scale: {
    credits: 1500,
    name: "AdaptifAI Scale Credits",
    amount: 24900,
    envPriceKey: "STRIPE_PRICE_SCALE",
    envPaymentLinkKey: "STRIPE_PAYMENT_LINK_SCALE",
  },
} as const;

export type CreditPackId = keyof typeof creditPacks;
