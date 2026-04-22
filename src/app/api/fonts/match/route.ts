import { NextRequest, NextResponse } from "next/server";

const fallbackFonts = ["Inter", "Roboto", "Montserrat", "Poppins", "Open Sans", "Lato", "Oswald", "Noto Sans Arabic", "Noto Sans JP"];

function scoreFont(font: string, sample: string) {
  const normalized = sample.toLowerCase();
  let score = 0;
  if (normalized.includes("bold") && ["Montserrat", "Oswald", "Poppins"].includes(font)) score += 3;
  if (/[\u0600-\u06ff]/.test(sample) && font.includes("Arabic")) score += 10;
  if (/[\u3040-\u30ff\u3400-\u9fff]/.test(sample) && font.includes("JP")) score += 10;
  if (normalized.includes("cta") && ["Inter", "Roboto"].includes(font)) score += 2;
  return score;
}

export async function GET(request: NextRequest) {
  const sample = request.nextUrl.searchParams.get("sample") ?? "";
  const key = process.env.GOOGLE_FONTS_API_KEY;
  let fonts = fallbackFonts;

  if (key) {
    const response = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${key}&sort=popularity`, {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (response.ok) {
      const payload = (await response.json()) as { items?: Array<{ family: string }> };
      fonts = payload.items?.slice(0, 80).map((item) => item.family) ?? fonts;
    }
  }

  const family = [...fonts].sort((a, b) => scoreFont(b, sample) - scoreFont(a, sample))[0] ?? "Inter";
  return NextResponse.json({
    family,
    css_url: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replaceAll("%20", "+")}:wght@400;600;700&display=swap`,
    source: key ? "google_webfonts_api" : "fallback_popularity_set",
  });
}
