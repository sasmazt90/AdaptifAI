import { NextResponse } from "next/server";
import { getAuthenticatedEmail } from "@/lib/auth";
import { spendCredits } from "@/lib/credits";

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedEmail(request);
    const body = (await request.json().catch(() => ({}))) as { mode?: string; credits?: number };
    const cost = Math.max(1, Math.trunc(Number(body.credits ?? 1)));
    const spend = await spendCredits(userId ?? "guest", cost);

    if (!spend.ok) {
      return NextResponse.json({ error: "Insufficient credits.", credits: spend.credits }, { status: 402 });
    }

    return NextResponse.json({
      ok: true,
      mode: body.mode ?? "edit",
      credits_remaining: spend.credits,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to apply edit.";
    return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : 500 });
  }
}
