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
      const credits = Number(session.metadata?.credits ?? 0);
      const userId = session.metadata?.user_id || session.customer_email || String(session.customer ?? "guest");
      const balance = addCredits(userId, credits, session.id);
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
