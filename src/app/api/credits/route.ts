import { NextResponse } from "next/server";
import { addCredits, getCredits, normalizeUserId } from "@/lib/credits";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = normalizeUserId(url.searchParams.get("user_id"));
  return NextResponse.json({
    user_id: userId,
    credits: getCredits(userId),
    currency: "credits",
    stateless: true,
    source: "local_credit_ledger",
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { user_id?: string; credits?: number };
  const userId = normalizeUserId(body.user_id);
  const credits = addCredits(userId, Math.max(0, Number(body.credits ?? 0)));
  return NextResponse.json({ user_id: userId, credits });
}
