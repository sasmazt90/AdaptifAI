import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseServerConfig } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json({ error: "Supabase auth is not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase auth is not configured." }, { status: 500 });
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    const alreadyExists = error.message.toLowerCase().includes("already");
    return NextResponse.json({ error: alreadyExists ? "This email is already registered. Please sign in." : error.message }, { status: alreadyExists ? 409 : 400 });
  }

  return NextResponse.json({ ok: true, user_id: data.user?.id, email });
}
