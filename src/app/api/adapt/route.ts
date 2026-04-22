import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedEmail } from "@/lib/auth";
import { spendCredits } from "@/lib/credits";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const backendUrl = process.env.ADAPTIFAI_BACKEND_URL ?? "http://127.0.0.1:8000";

  try {
    const formData = await request.formData();
    const userId = (await getAuthenticatedEmail(request)) ?? String(formData.get("user_id") ?? "guest");
    const response = await fetch(`${backendUrl}/adapt`, {
      method: "POST",
      body: formData,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : { error: `Backend returned ${response.status}`, detail: await response.text() };
    if (response.ok) {
      const spend = await spendCredits(userId, Number(payload.credits_estimated ?? 0));
      if (!spend.ok) {
        return NextResponse.json({ error: "Insufficient credits.", credits: spend.credits }, { status: 402 });
      }
      payload.credits_remaining = spend.credits;
    }
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Adapt pipeline is unavailable.";
    return NextResponse.json(
      {
        error: message,
        hint: "Start the FastAPI backend with: python -m uvicorn app.main:app --reload --port 8000",
      },
      { status: 503 },
    );
  }
}
