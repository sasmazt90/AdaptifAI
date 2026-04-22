import { NextRequest, NextResponse } from "next/server";
import { creditPacks, CreditPackId, getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { pack?: CreditPackId; user_id?: string };
    const packId = body.pack ?? "starter";
    const pack = creditPacks[packId];

    if (!pack) {
      return NextResponse.json({ error: "Unknown credit pack." }, { status: 400 });
    }

    const paymentLink = process.env[pack.envPaymentLinkKey];
    if (!process.env.STRIPE_SECRET_KEY && paymentLink) {
      return NextResponse.json({ url: paymentLink, mode: "payment_link" });
    }

    const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const stripe = getStripe();
    const configuredPriceId = process.env[pack.envPriceKey];
    const session = await stripe.checkout.sessions.create({
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
        user_id: body.user_id ?? "guest",
      },
      customer_email: body.user_id?.includes("@") ? body.user_id : undefined,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create Stripe Checkout Session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
