import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { addCredits } from "@/lib/credits";

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe webhook signing secret is not configured." }, { status: 400 });
  }

  try {
    const event = getStripe().webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      let credits = Number(session.metadata?.credits ?? 0);
      if (!credits) {
        const amount = Number(session.amount_total ?? 0);
        if (amount === 1900) credits = 250;
        if (amount === 4900) credits = 900;
        if (amount === 14900) credits = 3500;
      }
      let referenceEmail: string | undefined;
      if (session.client_reference_id?.startsWith("u_")) {
        try {
          referenceEmail = Buffer.from(session.client_reference_id.slice(2), "base64url").toString("utf8");
        } catch {
          referenceEmail = undefined;
        }
      }
      const userId = session.metadata?.user_id || session.customer_email || referenceEmail || String(session.customer ?? "guest");
      const balance = await addCredits(userId, credits, session.id, "stripe", "stripe_checkout");
      console.info("Credit purchase completed", {
        session: session.id,
        credits,
        customer: session.customer,
        balance,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe webhook payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
