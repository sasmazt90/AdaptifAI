import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedEmail } from "@/lib/auth";
import { creditPacks, CreditPackId, getStripe } from "@/lib/stripe";

async function createCheckoutSessionWithRest({
  origin,
  priceId,
  pack,
  packId,
  userId,
}: {
  origin: string;
  priceId: string;
  pack: (typeof creditPacks)[CreditPackId];
  packId: CreditPackId;
  userId: string;
}) {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe secret key is not configured.");

  const body = new URLSearchParams({
    mode: "payment",
    success_url: `${origin}?checkout=success&credits=${pack.credits}`,
    cancel_url: `${origin}?checkout=cancelled`,
    "line_items[0][quantity]": "1",
    "line_items[0][price]": priceId,
    "metadata[credits]": String(pack.credits),
    "metadata[pack]": packId,
    "metadata[user_id]": userId,
  });
  if (userId.includes("@")) body.set("customer_email", userId);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? "Unable to create Stripe Checkout Session.");
  return payload as { url?: string };
}

function paymentLinkForUser(paymentLink: string, userId: string) {
  const url = new URL(paymentLink);
  if (userId.includes("@")) url.searchParams.set("prefilled_email", userId);
  const reference = Buffer.from(userId, "utf8").toString("base64url");
  url.searchParams.set("client_reference_id", `u_${reference}`.slice(0, 200));
  return url.toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { pack?: CreditPackId; user_id?: string };
    const userId = (await getAuthenticatedEmail(request)) ?? body.user_id ?? "guest";
    const packId = body.pack ?? "starter";
    const pack = creditPacks[packId];

    if (!pack) {
      return NextResponse.json({ error: "Unknown credit pack." }, { status: 400 });
    }

    const paymentLink = process.env[pack.envPaymentLinkKey];
    if (!process.env.STRIPE_SECRET_KEY && paymentLink) {
      return NextResponse.json({ url: paymentLinkForUser(paymentLink, userId), mode: "payment_link" });
    }

    const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const configuredPriceId = process.env[pack.envPriceKey];
    let session: { url?: string | null };
    try {
      const stripe = getStripe();
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${origin}?checkout=success&credits=${pack.credits}`,
        cancel_url: `${origin}?checkout=cancelled`,
        line_items: configuredPriceId
          ? [{ quantity: 1, price: configuredPriceId }]
          : [
              {
                quantity: 1,
                price_data: {
                  currency: "usd",
                  unit_amount: pack.amount,
                  product_data: {
                    name: pack.name,
                    metadata: { credits: String(pack.credits) },
                  },
                },
              },
            ],
        metadata: {
          credits: String(pack.credits),
          pack: packId,
          user_id: userId,
        },
        customer_email: userId.includes("@") ? userId : undefined,
      });
    } catch {
      try {
        if (!configuredPriceId) throw new Error("Stripe price is not configured.");
        session = await createCheckoutSessionWithRest({ origin, priceId: configuredPriceId, pack, packId, userId });
      } catch {
        if (paymentLink) {
          return NextResponse.json({ url: paymentLinkForUser(paymentLink, userId), mode: "payment_link_fallback" });
        }
        throw new Error("Unable to create Stripe Checkout Session.");
      }
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create Stripe Checkout Session.";
    return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : 500 });
  }
}
