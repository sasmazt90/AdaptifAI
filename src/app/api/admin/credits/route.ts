import { NextResponse } from "next/server";
import { addCredits, normalizeUserId } from "@/lib/credits";
import { adminEmail, getSupabaseAdmin } from "@/lib/supabase";

async function requireAdmin(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  const supabase = getSupabaseAdmin();

  if (!supabase || !token) {
    return { ok: false as const, error: "Supabase auth is not configured." };
  }

  const { data, error } = await supabase.auth.getUser(token);
  const email = data.user?.email?.toLowerCase();
  if (error || email !== adminEmail) {
    return { ok: false as const, error: "Admin access required." };
  }

  return { ok: true as const, email };
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: 403 });

  const body = (await request.json()) as { user_id?: string; amount?: number; action?: "add" | "deduct" };
  const userId = normalizeUserId(body.user_id);
  const amount = Math.max(0, Math.trunc(Number(body.amount ?? 0)));
  const delta = body.action === "deduct" ? -amount : amount;

  if (!userId.includes("@")) {
    return NextResponse.json({ error: "A valid user email is required." }, { status: 400 });
  }
  if (!amount) {
    return NextResponse.json({ error: "Amount must be greater than zero." }, { status: 400 });
  }

  try {
    const credits = await addCredits(userId, delta, undefined, admin.email, "admin_adjustment");
    return NextResponse.json({ user_id: userId, credits, delta });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to adjust credits.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
