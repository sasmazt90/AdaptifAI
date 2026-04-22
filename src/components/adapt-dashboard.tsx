"use client";

import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  CloudUpload,
  CreditCard,
  Download,
  FileArchive,
  Frame,
  Languages,
  Loader2,
  LogIn,
  LogOut,
  Monitor,
  Move,
  Scissors,
  Shield,
  Smartphone,
  Sparkles,
  Type,
  User,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { languages, outputFormats, Placement, placements } from "@/lib/placements";
import { getSupabaseBrowser, hasSupabaseBrowserConfig } from "@/lib/supabase-client";

type Mode = "adapt" | "resize";
type AuthMode = "sign-in" | "sign-up";
type ConsentChoice = "necessary" | "all" | null;
type Device = "mobile" | "desktop";
type FitMode = "contain" | "cover" | "fill";
type PipelineResult = {
  job_id: string;
  outputs: Array<{ filename: string; download_url: string; width: number; height: number }>;
  credits_remaining?: number;
};

const platformOrder = ["META", "TIKTOK", "GOOGLE", "SNAPCHAT", "LINKEDIN", "NATIVE/WEB"];
const sampleCopy = {
  adapt: "[BOLD]Launch faster[/BOLD] with localized ads",
  resize: "Creative resized for every paid channel",
};

function cleanCopy(value: string) {
  return value.replaceAll("[BOLD]", "").replaceAll("[/BOLD]", "");
}

function overlaps(zone: Placement["safeZones"][number], box: { x: number; y: number; width: number; height: number }) {
  return zone.x < box.x + box.width && zone.x + zone.width > box.x && zone.y < box.y + box.height && zone.y + zone.height > box.y;
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-11 w-11 place-items-center rounded-md bg-[#101414] text-white">
        <span className="absolute left-2 top-2 h-3 w-3 rounded-sm bg-[#7ee1c6]" />
        <span className="absolute bottom-2 right-2 h-3 w-3 rounded-sm bg-[#ee4d6a]" />
        <span className="text-lg font-black">A</span>
      </div>
      <div>
        <p className="text-xl font-black leading-5">AdaptifAI</p>
        <p className="text-xs font-semibold uppercase text-[#0f766e]">Creative localization</p>
      </div>
    </div>
  );
}

function Collapsible({ title, icon, children, defaultOpen = true }: { title: string; icon?: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-md border border-[#151515]/10 bg-white">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold">
        <span className="flex items-center gap-2">{icon}{title}</span>
        <ChevronDown className={["h-4 w-4 text-[#0f766e] transition", open ? "rotate-180" : ""].join(" ")} />
      </button>
      {open && <div className="border-t border-[#151515]/10 p-4">{children}</div>}
    </section>
  );
}

function ConsentBanner() {
  const [choice, setChoice] = useState<ConsentChoice>(null);
  const [ready, setReady] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const storageKey = "adaptifai:consent:v1";

  useEffect(() => {
    queueMicrotask(() => {
      const saved = window.localStorage.getItem(storageKey);
      setChoice(saved === "all" || saved === "necessary" ? saved : null);
      setReady(true);
    });
  }, []);

  const saveChoice = (nextChoice: Exclude<ConsentChoice, null>) => {
    window.localStorage.setItem(storageKey, nextChoice);
    setChoice(nextChoice);
    setShowDetails(false);
  };

  if (!ready) return null;
  if (choice) {
    return (
      <button
        type="button"
        onClick={() => {
          setChoice(null);
          setShowDetails(true);
        }}
        className="fixed bottom-4 left-4 z-50 rounded-md border border-[#151515]/10 bg-white px-3 py-2 text-xs font-semibold text-[#151515] shadow-lg"
      >
        Privacy settings
      </button>
    );
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-4xl rounded-md border border-[#151515]/10 bg-white p-4 text-[#151515] shadow-2xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-black">Privacy and consent</p>
          <p className="mt-1 max-w-2xl text-sm text-[#555]">
            We use required cookies/storage for sign-in, credits, security and the editor. Optional analytics help improve the product and can be refused.
          </p>
          {showDetails && (
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <div className="rounded-md bg-[#faf9f5] p-3">
                <p className="font-bold">Necessary</p>
                <p className="mt-1 text-[#666]">Authentication session, credit balance, consent choice and security logs. Always active.</p>
              </div>
              <div className="rounded-md bg-[#faf9f5] p-3">
                <p className="font-bold">Analytics</p>
                <p className="mt-1 text-[#666]">Anonymous usage signals for product improvement. No ad tracking is loaded by default.</p>
              </div>
            </div>
          )}
          <div className="mt-2 flex gap-3 text-xs font-semibold">
            <a href="/privacy" className="text-[#0f766e] hover:text-[#151515]">Privacy GDPR/KVKK</a>
            <a href="/terms" className="text-[#0f766e] hover:text-[#151515]">Terms</a>
          </div>
        </div>
        <div className="grid shrink-0 gap-2 sm:grid-cols-3 md:grid-cols-1">
          <button type="button" onClick={() => saveChoice("necessary")} className="h-10 rounded-md border border-[#151515]/15 px-4 text-sm font-semibold">Necessary only</button>
          <button type="button" onClick={() => saveChoice("all")} className="h-10 rounded-md bg-[#151515] px-4 text-sm font-semibold text-white">Accept all</button>
          <button type="button" onClick={() => setShowDetails((value) => !value)} className="h-10 rounded-md bg-[#e8f7f1] px-4 text-sm font-semibold text-[#064e46]">Manage</button>
        </div>
      </div>
    </div>
  );
}

function AuthPanel({
  authMode,
  setAuthMode,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authError,
  authPending,
  submitAuth,
}: {
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  authEmail: string;
  setAuthEmail: (value: string) => void;
  authPassword: string;
  setAuthPassword: (value: string) => void;
  authError: string | null;
  authPending: boolean;
  submitAuth: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form id="auth" onSubmit={submitAuth} className="rounded-md border border-[#151515]/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-[#0f766e]">{authMode === "sign-in" ? "Welcome back" : "Start free"}</p>
          <h2 className="text-2xl font-semibold">{authMode === "sign-in" ? "Sign in" : "Create account"}</h2>
        </div>
        <LogIn className="h-5 w-5 text-[#0f766e]" />
      </div>
      <div className="mt-5 space-y-3">
        <label className="block text-sm font-semibold">Email<input className="mt-1 h-11 w-full rounded-md border border-[#151515]/15 px-3 outline-none focus:border-[#0f766e]" type="email" autoComplete="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} required /></label>
        <label className="block text-sm font-semibold">Password<input className="mt-1 h-11 w-full rounded-md border border-[#151515]/15 px-3 outline-none focus:border-[#0f766e]" type="password" autoComplete={authMode === "sign-in" ? "current-password" : "new-password"} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} required minLength={6} /></label>
      </div>
      {authError && <p className="mt-3 rounded-md bg-[#fff0d8] p-3 text-sm text-[#6b3b00]">{authError}</p>}
      <button type="submit" disabled={authPending} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#151515] font-semibold text-white disabled:bg-[#d6d0c4]">
        {authPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        {authMode === "sign-in" ? "Sign in" : "Sign up and enter app"}
      </button>
      <button type="button" onClick={() => setAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in")} className="mt-3 w-full text-sm font-semibold text-[#0f766e]">
        {authMode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}

function LandingPage({
  authMode,
  setAuthMode,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authError,
  authPending,
  submitAuth,
}: {
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  authEmail: string;
  setAuthEmail: (value: string) => void;
  authPassword: string;
  setAuthPassword: (value: string) => void;
  authError: string | null;
  authPending: boolean;
  submitAuth: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const chooseAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    document.getElementById("auth")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <main className="min-h-screen bg-[#faf9f5] text-[#151515]">
      <header className="sticky top-0 z-30 border-b border-[#151515]/10 bg-[#faf9f5]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-5 py-4">
          <Brand />
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => chooseAuth("sign-in")} className="h-10 rounded-md border border-[#151515]/15 bg-white px-4 text-sm font-semibold">Sign In</button>
            <button type="button" onClick={() => chooseAuth("sign-up")} className="h-10 rounded-md bg-[#151515] px-4 text-sm font-semibold text-white">Sign Up</button>
          </div>
        </div>
      </header>

      <section className="border-b border-[#151515]/10">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-5 py-14 lg:grid-cols-[1fr_420px] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase text-[#0f766e]">AI creative localization for paid media</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-black leading-[1.02] tracking-normal md:text-7xl">AdaptifAI turns one ad into launch-ready global variants.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4f4f4f]">
              Extract campaign copy, translate it contextually, remove source text from the background, and preview exact Meta, TikTok, Google, LinkedIn and native placements before export.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={() => chooseAuth("sign-up")} className="flex h-12 items-center gap-2 rounded-md bg-[#ee4d6a] px-5 font-semibold text-white">Start localizing <ArrowRight className="h-4 w-4" /></button>
              <button type="button" onClick={() => chooseAuth("sign-in")} className="h-12 rounded-md border border-[#151515]/15 bg-white px-5 font-semibold">Open workspace</button>
            </div>
          </div>
          <AuthPanel authMode={authMode} setAuthMode={setAuthMode} authEmail={authEmail} setAuthEmail={setAuthEmail} authPassword={authPassword} setAuthPassword={setAuthPassword} authError={authError} authPending={authPending} submitAuth={submitAuth} />
        </div>
      </section>

      <section className="mx-auto grid max-w-[1180px] gap-5 px-5 py-12 md:grid-cols-3">
        {[
          ["Marketing text only", "Detect headlines and CTAs while leaving ingredients, labels and product text untouched."],
          ["Layout-safe translation", "Preserve emphasis tags, fit translated copy into original bounds and flag platform safe-zone conflicts."],
          ["Export for every channel", "Generate original, PNG, JPG, WebP or PDF outputs across paid social, display and native placements."],
        ].map(([title, body]) => (
          <div key={title} className="border-t border-[#151515]/15 pt-5">
            <p className="text-lg font-black">{title}</p>
            <p className="mt-2 text-sm leading-6 text-[#555]">{body}</p>
          </div>
        ))}
      </section>

      <section className="border-y border-[#151515]/10 bg-white">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-5 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase text-[#0f766e]">Workflow</p>
            <h2 className="mt-3 text-4xl font-black">Upload once, approve every placement with context.</h2>
            <p className="mt-4 text-[#555]">The app separates Adapt and Resize so translation QA and production resizing stay focused.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {["OCR and copy filtering", "GPT-4o translation", "Background restoration", "Platform previews", "Manual edit pass", "Credit-based checkout"].map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-md bg-[#faf9f5] p-3">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-[#151515] text-xs font-black text-white">{index + 1}</span>
                <span className="text-sm font-semibold">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-5 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase text-[#0f766e]">Pricing</p>
            <h2 className="mt-2 text-4xl font-black">Credits that scale with production volume.</h2>
          </div>
          <button type="button" onClick={() => chooseAuth("sign-up")} className="h-11 rounded-md bg-[#151515] px-5 font-semibold text-white">Create account</button>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Starter", "250 credits", "$19", "Small campaign tests and quick localization checks."],
            ["Studio", "900 credits", "$49", "Recurring paid social and display production."],
            ["Scale", "3500 credits", "$149", "High-volume global creative operations."],
          ].map(([name, creditsLabel, price, body]) => (
            <div key={name} className="rounded-md border border-[#151515]/10 bg-white p-5">
              <p className="text-lg font-black">{name}</p>
              <p className="mt-4 text-4xl font-black">{price}</p>
              <p className="mt-2 text-sm font-semibold text-[#0f766e]">{creditsLabel}</p>
              <p className="mt-4 text-sm leading-6 text-[#555]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 border-t border-[#151515]/10 px-5 py-5 text-xs text-[#666]">
        <span>Strictly stateless creative processing / temporary files auto-delete after 24h</span>
        <nav className="flex gap-4"><a href="/terms" className="hover:text-[#151515]">Terms</a><a href="/privacy" className="hover:text-[#151515]">Privacy GDPR/KVKK</a><a href="/refund" className="hover:text-[#151515]">Refund</a></nav>
      </footer>
      <ConsentBanner />
    </main>
  );
}

function Creative({ placement, copy, mode, x, y, opacity, scale, fit }: { placement: Placement; copy: string; mode: Mode; x: number; y: number; opacity: number; scale: number; fit: FitMode }) {
  const box = placement.ratio === "9:16" ? { x: 9 + x, y: 28 + y, width: 65, height: 24 } : { x: 8 + x, y: 30 + y, width: 62, height: 26 };
  return (
    <div className="relative overflow-hidden bg-[#f0d553]" style={{ aspectRatio: `${placement.width} / ${placement.height}` }}>
      <div
        className={["absolute inset-0 bg-[linear-gradient(135deg,#f9f4e8_0%,#f0d553_34%,#38b6a6_68%,#171717_100%)]", fit === "fill" ? "blur-[1px]" : ""].join(" ")}
        style={{ transform: `scale(${scale / 100})` }}
      />
      <div className="absolute left-[8%] top-[12%] h-[18%] w-[28%] rounded-[50%] bg-white/80" />
      <div className="absolute bottom-[10%] right-[8%] h-[28%] w-[44%] bg-[#ee4d6a]/80" />
      <div className="absolute left-[12%] top-[22%] h-[24%] w-[58%] rounded bg-[#ff4d4d]/20" style={{ opacity: opacity / 100 }} />
      <div className="absolute rounded-md border border-[#111] bg-white/92 p-3 shadow-lg" style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.width}%`, minHeight: `${box.height}%` }}>
        <p className="text-[10px] font-bold uppercase">{cleanCopy(copy || sampleCopy[mode])}</p>
        <p className="mt-1 text-[9px] leading-4">{mode === "adapt" ? "Translated copy stays inside text bounds." : "Resize keeps CTA and visual focus visible."}</p>
      </div>
      {placement.safeZones.map((zone) => (
        <span key={zone.id} className="absolute border border-dashed border-[#ff4d4d] bg-[#ff4d4d]/14" style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.width}%`, height: `${zone.height}%` }} title={zone.label} />
      ))}
    </div>
  );
}

function AdFrame({ placement, children }: { placement: Placement; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-[#151515]/15 bg-white">
      <div className="flex items-center justify-between border-b border-[#151515]/10 bg-[#faf9f5] px-2 py-1 text-[10px] font-semibold uppercase tracking-normal text-[#666]">
        <span>Ad creative</span>
        <span>{placement.width} x {placement.height}</span>
      </div>
      {children}
    </div>
  );
}

function Preview({ placement, mode, device, copy, x, y, opacity, scale, fit }: { placement: Placement; mode: Mode; device: Device; copy: string; x: number; y: number; opacity: number; scale: number; fit: FitMode }) {
  const box = placement.ratio === "9:16" ? { x: 9 + x, y: 28 + y, width: 65, height: 24 } : { x: 8 + x, y: 30 + y, width: 62, height: 26 };
  const warnings = placement.safeZones.filter((zone) => overlaps(zone, box));
  const creative = <AdFrame placement={placement}><Creative placement={placement} mode={mode} copy={copy} x={x} y={y} opacity={opacity} scale={scale} fit={fit} /></AdFrame>;
  let shell: ReactNode = null;

  if (placement.platform === "META") shell = (
    <div className={["mx-auto overflow-hidden rounded-md border bg-white shadow-xl", device === "mobile" ? "w-[320px]" : "w-full max-w-[700px]"].join(" ")}>
      <div className="flex items-center gap-3 border-b px-4 py-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#1877f2] font-black text-white">f</span><div><p className="text-xs font-bold">AdaptifAI Sponsored</p><p className="text-[10px] text-[#666]">{placement.label} placement preview</p></div><button type="button" className="ml-auto rounded-full border px-3 py-1 text-[10px] font-bold text-[#1877f2]">Follow</button></div>
      <div className="p-3">{creative}</div><div className="flex justify-around border-t px-4 py-3 text-xs font-bold text-[#555]"><span>Like</span><span>Comment</span><span>Share</span></div>
    </div>
  );
  else if (placement.platform === "TIKTOK") shell = (
    <div className="relative mx-auto w-[320px] overflow-hidden rounded-[26px] bg-[#0c0c0f] p-3 text-white shadow-2xl">
      <div className="overflow-hidden rounded-[20px]">{creative}</div><div className="absolute right-5 top-[36%] grid gap-3 text-center text-[10px] font-bold">{["+", "Like", "Share", "Audio"].map((i) => <span key={i} className="grid h-9 w-9 place-items-center rounded-full bg-white/20">{i}</span>)}</div>
      <div className="absolute bottom-6 left-6 right-16 text-xs"><p className="font-bold">@brand</p><p className="text-white/80">Localized campaign copy</p></div>
    </div>
  );
  else if (placement.overlay === "youtube") shell = (
    <div className={["mx-auto overflow-hidden rounded-md bg-[#0f0f0f] text-white shadow-xl", device === "mobile" ? "w-[320px]" : "w-full max-w-[760px]"].join(" ")}>
      <div className="flex justify-between px-4 py-3 text-xs font-bold"><span>YouTube</span><span>Ad preview</span></div><div className="px-3">{creative}</div><div className="px-3 py-3"><div className="h-1 rounded bg-white/25"><div className="h-1 w-1/3 rounded bg-[#ff0033]" /></div><div className="mt-3 flex justify-between text-[11px] text-white/75"><span>0:06</span><span>Skip ad</span></div></div>
    </div>
  );
  else if (placement.platform === "LINKEDIN") shell = (
    <div className={["mx-auto overflow-hidden rounded-md border bg-white shadow-xl", device === "mobile" ? "w-[320px]" : "w-full max-w-[690px]"].join(" ")}>
      <div className="flex items-center gap-3 border-b px-4 py-3"><span className="grid h-9 w-9 place-items-center rounded bg-[#0a66c2] font-black text-white">in</span><div><p className="text-xs font-bold">AdaptifAI</p><p className="text-[10px] text-[#666]">Promoted</p></div></div><div className="p-3">{creative}</div><div className="flex justify-around border-t px-4 py-3 text-xs font-bold text-[#555]"><span>Like</span><span>Comment</span><span>Send</span></div>
    </div>
  );
  else if (placement.platform === "SNAPCHAT") shell = (
    <div className="relative mx-auto w-[320px] overflow-hidden rounded-[26px] bg-[#fffc00] p-3 shadow-2xl"><div className="overflow-hidden rounded-[20px]">{creative}</div><div className="absolute left-6 right-6 top-6 flex justify-between text-xs font-bold"><span>Story Ad</span><span>...</span></div><div className="absolute bottom-6 left-8 right-8 rounded-full bg-white px-4 py-2 text-center text-xs font-black">Swipe up</div></div>
  );
  else shell = (
    <div className={["mx-auto overflow-hidden rounded-md border bg-white shadow-xl", device === "mobile" ? "w-[340px]" : "w-full max-w-[820px]"].join(" ")}>
      <div className="flex items-center gap-2 border-b bg-[#f7f7f7] px-4 py-3"><span className="h-3 w-3 rounded-full bg-[#ee4d6a]" /><span className="h-3 w-3 rounded-full bg-[#f0d553]" /><span className="h-3 w-3 rounded-full bg-[#38b6a6]" /><span className="ml-3 rounded bg-white px-3 py-1 text-[10px] text-[#666]">news.example/ad-preview</span></div>
      <div className={["grid gap-4 p-4", device === "desktop" && placement.height > 120 ? "grid-cols-[1fr_300px]" : ""].join(" ")}><div><p className="text-xs font-black uppercase text-[#0f766e]">{placement.platform === "GOOGLE" ? "Google Display Network" : "Native publisher"}</p><h3 className="mt-2 text-xl font-semibold">{placement.platform === "GOOGLE" ? "Display inventory preview" : "Article layout"}</h3><div className="mt-4 space-y-2"><div className="h-3 rounded bg-[#ededed]" /><div className="h-3 w-5/6 rounded bg-[#ededed]" /><div className="h-3 w-2/3 rounded bg-[#ededed]" /></div></div><div><p className="mb-1 text-right text-[10px] font-semibold uppercase text-[#777]">Advertisement</p>{creative}</div></div>
    </div>
  );

  return (
    <div className="flex min-h-[560px] flex-col justify-center gap-4 bg-[#f3f0e8] p-5">
      {shell}
      <div className="mx-auto flex w-full max-w-[760px] justify-between rounded-md bg-[#111] px-4 py-3 text-xs text-white">
        <span>{placement.platform} / {placement.label} / {placement.width}x{placement.height}</span>
        <span className={warnings.length ? "text-[#ffcf4a]" : "text-[#7ee1c6]"}>{warnings.length ? `${warnings.length} safe-zone warning` : "Safe zone clear"}</span>
      </div>
    </div>
  );
}

export function AdaptDashboard() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const supabaseConfigured = hasSupabaseBrowserConfig();
  const grouped = useMemo(() => platformOrder.map((p) => [p, placements.filter((x) => x.platform === p)] as const), []);
  const [mode, setMode] = useState<Mode>("adapt");
  const [device, setDevice] = useState<Device>("mobile");
  const [selectedPlacementIds, setSelectedPlacementIds] = useState(["meta-stories", "tiktok-in-feed", "gdn-300x250"]);
  const [activePlacementId, setActivePlacementId] = useState("meta-stories");
  const [selectedLanguages, setSelectedLanguages] = useState(["DE", "TR", "AR"]);
  const [selectedFormat, setSelectedFormat] = useState("PNG");
  const [files, setFiles] = useState<File[]>([]);
  const [credits, setCredits] = useState(240);
  const [userId, setUserId] = useState(() => typeof window === "undefined" ? "guest@adaptif.ai" : window.localStorage.getItem("adaptifai:user") || "guest@adaptif.ai");
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(!supabaseConfigured);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authPending, setAuthPending] = useState(false);
  const [adminTargetEmail, setAdminTargetEmail] = useState("");
  const [adminAmount, setAdminAmount] = useState(100);
  const [adminAction, setAdminAction] = useState<"add" | "deduct">("add");
  const [adminStatus, setAdminStatus] = useState<string | null>(null);
  const [isAdminUpdating, setIsAdminUpdating] = useState(false);
  const [copy, setCopy] = useState(sampleCopy.adapt);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [opacity, setOpacity] = useState(18);
  const [scale, setScale] = useState(100);
  const [fit, setFit] = useState<FitMode>("cover");
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isApplyingEdit, setIsApplyingEdit] = useState(false);
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activePlacement = placements.find((p) => p.id === activePlacementId) ?? placements[0];
  const currentUserEmail = authUser?.email ?? userId;
  const isAdmin = currentUserEmail.toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "tolgar@sasmaz.digital").toLowerCase();

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuthUser(data.session?.user ?? null);
      setSessionToken(data.session?.access_token ?? null);
      if (data.session?.user.email) setUserId(data.session.user.email);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      setSessionToken(session?.access_token ?? null);
      if (session?.user.email) setUserId(session.user.email);
    });
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, [supabase]);

  useEffect(() => {
    if (supabaseConfigured && !sessionToken) return;
    window.localStorage.setItem("adaptifai:user", currentUserEmail);
    fetch(`/api/credits?user_id=${encodeURIComponent(currentUserEmail)}`, { headers: sessionToken ? { authorization: `Bearer ${sessionToken}` } : undefined })
      .then((r) => r.json()).then((p) => setCredits(Number(p.credits ?? 0))).catch(() => undefined);
  }, [currentUserEmail, sessionToken, supabaseConfigured]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f0d553"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#38b6a6"; ctx.fillRect(156, 0, 144, 150);
    ctx.fillStyle = `rgba(255,77,77,${opacity / 100})`; ctx.fillRect(54, 38, 162, 42);
    ctx.fillStyle = "#111"; ctx.font = "700 16px Arial"; ctx.fillText(cleanCopy(copy).slice(0, 28), 30 + x, 70 + y);
  }, [copy, x, y, opacity]);

  const togglePlacement = (id: string) => {
    setSelectedPlacementIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setActivePlacementId(id);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setCopy(sampleCopy[next]);
    setEditStatus(null);
    setError(null);
  };

  const runProcess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsRunning(true);
    setError(null);
    setResult(null);
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("user_id", currentUserEmail);
    formData.append("target_languages", mode === "adapt" ? selectedLanguages.join(",") : "EN");
    formData.append("output_format", selectedFormat);
    formData.append("placements", selectedPlacementIds.join(","));
    try {
      const response = await fetch("/api/adapt", { method: "POST", body: formData, headers: sessionToken ? { authorization: `Bearer ${sessionToken}` } : undefined });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Pipeline failed.");
      setResult(payload);
      setCredits(Number(payload.credits_remaining ?? credits));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Pipeline failed.");
    } finally {
      setIsRunning(false);
    }
  };

  const applyManualEdit = async () => {
    setIsApplyingEdit(true);
    setEditStatus(null);
    setError(null);
    try {
      const response = await fetch("/api/edit", {
        method: "POST",
        headers: { "content-type": "application/json", ...(sessionToken ? { authorization: `Bearer ${sessionToken}` } : {}) },
        body: JSON.stringify({ mode, credits: 1 }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to apply edit.");
      setCredits(Number(payload.credits_remaining ?? credits));
      setEditStatus(`${mode === "adapt" ? "Translation edit" : "Resize edit"} applied. 1 credit used.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to apply edit.");
    } finally {
      setIsApplyingEdit(false);
    }
  };

  const buyCredits = async () => {
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "content-type": "application/json", ...(sessionToken ? { authorization: `Bearer ${sessionToken}` } : {}) },
      body: JSON.stringify({ pack: "starter", user_id: currentUserEmail }),
    });
    const payload = await response.json();
    if (payload.url) window.location.href = payload.url;
    else setError(payload.error ?? "Stripe Checkout is not configured yet.");
  };

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setAuthError(null);
    setAuthPending(true);
    try {
      const email = authEmail.trim().toLowerCase();
      if (authMode === "sign-up") {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password: authPassword }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Unable to create account.");
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password: authPassword });
      if (error) throw error;
      if (data.user?.email) setUserId(data.user.email);
    } catch (caught) {
      setAuthError(caught instanceof Error ? caught.message : "Authentication failed.");
    } finally {
      setAuthPending(false);
    }
  };

  const adjustCredits = async () => {
    setIsAdminUpdating(true);
    setAdminStatus(null);
    try {
      const response = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ user_id: adminTargetEmail, amount: adminAmount, action: adminAction }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to adjust credits.");
      setAdminStatus(`${payload.user_id} balance: ${payload.credits} credits`);
      if (payload.user_id === currentUserEmail.toLowerCase()) setCredits(Number(payload.credits));
    } catch (caught) {
      setAdminStatus(caught instanceof Error ? caught.message : "Unable to adjust credits.");
    } finally {
      setIsAdminUpdating(false);
    }
  };

  if (!authReady) return <main className="grid min-h-screen place-items-center bg-[#faf9f5]"><Loader2 className="h-7 w-7 animate-spin text-[#0f766e]" /></main>;

  if (supabaseConfigured && !authUser) {
    return (
      <LandingPage authMode={authMode} setAuthMode={setAuthMode} authEmail={authEmail} setAuthEmail={setAuthEmail} authPassword={authPassword} setAuthPassword={setAuthPassword} authError={authError} authPending={authPending} submitAuth={submitAuth} />
    );
  }

  return (
    <main className="min-h-screen bg-[#faf9f5] text-[#151515]">
      <header className="sticky top-0 z-20 border-b border-[#151515]/10 bg-[#faf9f5]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Brand />
          <div className="flex items-center gap-1 rounded-md bg-[#f1eee6] p-1">
            {(["adapt", "resize"] as const).map((item) => (
              <button key={item} type="button" onClick={() => switchMode(item)} className={["h-9 rounded px-4 text-sm font-semibold capitalize transition", mode === item ? "bg-[#151515] text-white" : "text-[#555] hover:bg-white"].join(" ")}>{item}</button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 items-center gap-2 rounded-md border border-[#151515]/15 bg-white px-3 text-sm font-semibold"><Sparkles className="h-4 w-4 text-[#0f766e]" />{credits} credits</div>
            <button type="button" onClick={buyCredits} className="flex h-10 items-center gap-2 rounded-md bg-[#151515] px-4 text-sm font-semibold text-white"><CreditCard className="h-4 w-4" />Buy credits</button>
            <div className="flex h-10 items-center gap-2 rounded-md border border-[#151515]/15 bg-white px-3 text-sm font-semibold"><User className="h-4 w-4 text-[#0f766e]" /><span className="hidden max-w-[190px] truncate md:block">{currentUserEmail}</span></div>
            {supabaseConfigured && <button type="button" onClick={() => supabase?.auth.signOut()} className="grid h-10 w-10 place-items-center rounded-md border border-[#151515]/15 bg-white" aria-label="Sign out"><LogOut className="h-4 w-4 text-[#0f766e]" /></button>}
          </div>
        </div>
      </header>

      <form onSubmit={runProcess} className="mx-auto grid max-w-[1560px] gap-4 px-5 py-5 xl:grid-cols-[380px_minmax(560px,1fr)_380px]">
        <aside className="space-y-4">
          <section className="rounded-md border border-[#151515]/10 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase text-[#0f766e]">{mode} workspace</p><h1 className="text-xl font-semibold">{mode === "adapt" ? "Translate and restore" : "Resize placements"}</h1></div>
              <button type="submit" disabled={isRunning || selectedPlacementIds.length === 0 || (mode === "adapt" && selectedLanguages.length === 0)} className="flex h-10 min-w-28 items-center justify-center gap-2 rounded-md bg-[#ee4d6a] px-3 text-sm font-semibold text-white disabled:bg-[#d6d0c4]">{isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Run</button>
            </div>
          </section>

          {isAdmin && (
            <section className="rounded-md border border-[#151515]/10 bg-white p-4">
              <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Admin Credits</h2><Shield className="h-4 w-4 text-[#0f766e]" /></div>
              <label className="block text-sm font-semibold">User email<input className="mt-1 h-10 w-full rounded-md border border-[#151515]/10 bg-[#faf9f5] px-3 outline-none focus:border-[#0f766e]" type="email" value={adminTargetEmail} onChange={(e) => setAdminTargetEmail(e.target.value)} /></label>
              <label className="mt-3 block text-sm font-semibold">Credits<input className="mt-1 h-10 w-full rounded-md border border-[#151515]/10 bg-[#faf9f5] px-3 outline-none focus:border-[#0f766e]" type="number" min="1" value={adminAmount} onChange={(e) => setAdminAmount(Number(e.target.value))} /></label>
              <div className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-[#f1eee6] p-1">{(["add", "deduct"] as const).map((action) => <button key={action} type="button" onClick={() => setAdminAction(action)} className={["h-9 rounded text-xs font-semibold capitalize", adminAction === action ? "bg-[#151515] text-white" : "text-[#555] hover:bg-white"].join(" ")}>{action}</button>)}</div>
              <button type="button" onClick={adjustCredits} disabled={isAdminUpdating} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#0f766e] text-sm font-semibold text-white disabled:bg-[#d6d0c4]">{isAdminUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}Apply credit change</button>
              {adminStatus && <p className="mt-3 rounded-md bg-[#e8f7f1] p-3 text-sm text-[#064e46]">{adminStatus}</p>}
            </section>
          )}

          <section className="rounded-md border border-[#151515]/10 bg-white p-4">
            <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Upload</h2><FileArchive className="h-4 w-4 text-[#0f766e]" /></div>
            <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-[#151515]/30 bg-[#f6f1e7] p-4 text-center hover:border-[#0f766e]"><CloudUpload className="mb-3 h-8 w-8 text-[#0f766e]" /><span className="text-sm font-semibold">Upload PNG, WebP, JPG, JPEG, PDF or ZIP</span><span className="mt-1 text-xs text-[#595959]">Multiple files supported</span><input className="sr-only" multiple accept=".png,.webp,.jpg,.jpeg,.pdf,.zip" type="file" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} /></label>
            <div className="mt-3 space-y-2">{(files.length ? files : [{ name: "No files selected", size: 0 } as File]).map((file) => <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-md bg-[#faf9f5] px-3 py-2 text-xs"><span className="max-w-[220px] truncate">{file.name}</span><span>{file.size ? `${Math.ceil(file.size / 1024)} KB` : ""}</span></div>)}</div>
          </section>

          {mode === "adapt" ? (
            <>
              <Collapsible title="Languages" icon={<Languages className="h-4 w-4 text-[#0f766e]" />}>
                <div className="grid grid-cols-2 gap-2">{languages.map((language) => { const selected = selectedLanguages.includes(language.code); return <button key={language.code} type="button" onClick={() => setSelectedLanguages((current) => selected ? current.filter((code) => code !== language.code) : [...current, language.code])} className={["flex h-10 items-center justify-between rounded-md border px-3 text-sm", selected ? "border-[#0f766e] bg-[#dff8ef] text-[#064e46]" : "border-[#151515]/10 bg-[#faf9f5]"].join(" ")}>{language.code}{selected && <Check className="h-4 w-4" />}</button>; })}</div>
              </Collapsible>
              <Collapsible title="Output Format" icon={<Download className="h-4 w-4 text-[#0f766e]" />}>
                <div className="grid grid-cols-5 gap-1 rounded-md bg-[#f1eee6] p-1">{outputFormats.map((format) => <button key={format} type="button" onClick={() => setSelectedFormat(format)} className={["h-9 rounded text-xs font-semibold", selectedFormat === format ? "bg-[#151515] text-white" : "text-[#555] hover:bg-white"].join(" ")}>{format}</button>)}</div>
              </Collapsible>
            </>
          ) : (
            <Collapsible title="Dimensions" icon={<Frame className="h-4 w-4 text-[#0f766e]" />}>
              <div className="max-h-[500px] space-y-4 overflow-auto pr-1">{grouped.map(([platform, items]) => <div key={platform}><p className="mb-2 text-xs font-semibold uppercase text-[#777]">{platform}</p><div className="space-y-2">{items.map((placement) => { const selected = selectedPlacementIds.includes(placement.id); return <label key={placement.id} className={["flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm", selected ? "border-[#0f766e] bg-[#e8f7f1]" : "border-[#151515]/10 bg-[#faf9f5]"].join(" ")}><input type="checkbox" className="h-4 w-4 accent-[#0f766e]" checked={selected} onChange={() => togglePlacement(placement.id)} /><span className="min-w-0 flex-1"><span className="block font-semibold">{placement.label}</span><span className="text-xs text-[#666]">{placement.ratio} / {placement.width}x{placement.height}</span></span></label>; })}</div></div>)}</div>
            </Collapsible>
          )}

          <Collapsible title={mode === "adapt" ? "Placement Preview" : "Active Preview"} icon={<Frame className="h-4 w-4 text-[#0f766e]" />}>
            <div className="max-h-[360px] space-y-4 overflow-auto pr-1">{grouped.map(([platform, items]) => <div key={platform}><p className="mb-2 text-xs font-semibold uppercase text-[#777]">{platform}</p><div className="space-y-2">{items.map((placement) => { const selected = selectedPlacementIds.includes(placement.id); const active = activePlacementId === placement.id; return <button key={placement.id} type="button" onClick={() => { setActivePlacementId(placement.id); if (mode === "adapt") togglePlacement(placement.id); }} className={["w-full rounded-md border px-3 py-2 text-left text-sm", active ? "border-[#ee4d6a] bg-[#fff0f3]" : selected ? "border-[#0f766e] bg-[#e8f7f1]" : "border-[#151515]/10 bg-[#faf9f5]"].join(" ")}><span className="block font-semibold">{placement.label}</span><span className="text-xs text-[#666]">{placement.ratio} / {placement.width}x{placement.height}</span></button>; })}</div></div>)}</div>
          </Collapsible>
        </aside>

        <section className="overflow-hidden rounded-md border border-[#151515]/10 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#151515]/10 px-4 py-3">
            <div><h2 className="font-semibold">{mode === "adapt" ? "Adapt Result" : "Resize Result"}</h2><p className="text-xs text-[#666]">Selected placement rendered inside platform UI with safe-zone masks</p></div>
            <div className="flex items-center gap-1 rounded-md bg-[#f1eee6] p-1">{(["mobile", "desktop"] as const).map((item) => <button key={item} type="button" onClick={() => setDevice(item)} className={["flex h-9 items-center gap-2 rounded px-3 text-xs font-semibold capitalize", device === item ? "bg-[#151515] text-white" : "text-[#555] hover:bg-white"].join(" ")}>{item === "mobile" ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}{item}</button>)}</div>
          </div>
          <Preview placement={activePlacement} mode={mode} device={device} copy={copy} x={x} y={y} opacity={opacity} scale={scale} fit={fit} />
          <div className="border-t border-[#151515]/10 p-4">
            {error && <div className="mb-3 flex gap-2 rounded-md bg-[#fff0d8] p-3 text-sm text-[#6b3b00]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
            {result ? (
              <div className="space-y-3 text-sm">
                <div className="rounded-md bg-[#e8f7f1] p-3">Job {result.job_id} completed / {result.outputs.length} exports</div>
                <div className="grid gap-2 sm:grid-cols-2">{result.outputs.slice(0, 6).map((output) => <a key={output.filename} href={output.download_url} className="flex items-center justify-between rounded-md border border-[#151515]/10 px-3 py-2 hover:border-[#0f766e]"><span className="truncate">{output.filename}</span><Download className="h-4 w-4 text-[#0f766e]" /></a>)}</div>
              </div>
            ) : (
              <p className="text-sm text-[#666]">{mode === "adapt" ? "TrOCR extraction, GPT-4o translation, inpainting and localized exports will appear here." : "Selected dimension exports and platform-specific previews will appear here."}</p>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-md border border-[#151515]/10 bg-white p-4">
            <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">{mode === "adapt" ? "Translation Editor" : "Resize Editor"}</h2>{mode === "adapt" ? <Type className="h-4 w-4 text-[#0f766e]" /> : <Frame className="h-4 w-4 text-[#0f766e]" />}</div>
            {mode === "adapt" ? (
              <>
                <textarea className="min-h-32 w-full resize-none rounded-md border border-[#151515]/10 bg-[#faf9f5] p-3 text-sm outline-none focus:border-[#0f766e]" value={copy} onChange={(e) => setCopy(e.target.value)} aria-label="Manual translation override" />
                <div className="mt-3 grid grid-cols-2 gap-2">{[["Preserve bold", Type], ["Move text", Move], ["Mask cleanup", Scissors], ["Fit bounds", Frame]].map(([label, Icon]) => <button key={String(label)} type="button" className="flex h-11 items-center gap-2 rounded-md border border-[#151515]/10 bg-[#faf9f5] px-3 text-sm font-semibold"><Icon className="h-4 w-4 text-[#0f766e]" />{String(label)}</button>)}</div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-1 rounded-md bg-[#f1eee6] p-1">{(["contain", "cover", "fill"] as const).map((item) => <button key={item} type="button" onClick={() => setFit(item)} className={["h-9 rounded text-xs font-semibold capitalize", fit === item ? "bg-[#151515] text-white" : "text-[#555] hover:bg-white"].join(" ")}>{item}</button>)}</div>
                <div className="mt-3 space-y-2 text-xs font-semibold text-[#555]"><label className="block">Creative scale<input className="w-full accent-[#0f766e]" type="range" min="70" max="140" value={scale} onChange={(e) => setScale(Number(e.target.value))} /></label></div>
              </>
            )}
            <div className="mt-3 space-y-2 text-xs font-semibold text-[#555]">
              <label className="block">Text X<input className="w-full accent-[#0f766e]" type="range" min="-24" max="24" value={x} onChange={(e) => setX(Number(e.target.value))} /></label>
              <label className="block">Text Y<input className="w-full accent-[#0f766e]" type="range" min="-24" max="24" value={y} onChange={(e) => setY(Number(e.target.value))} /></label>
              <label className="block">Mask opacity<input className="w-full accent-[#ee4d6a]" type="range" min="0" max="70" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} /></label>
            </div>
            <canvas ref={canvasRef} width={300} height={150} className="mt-3 h-auto w-full rounded-md border border-[#151515]/10" />
            <button type="button" onClick={applyManualEdit} disabled={isApplyingEdit} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0f766e] text-sm font-semibold text-white disabled:bg-[#d6d0c4]">{isApplyingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Apply edit / use 1 credit</button>
            {editStatus && <p className="mt-3 rounded-md bg-[#e8f7f1] p-3 text-sm text-[#064e46]">{editStatus}</p>}
          </section>

          <section className="rounded-md border border-[#151515]/10 bg-white p-4">
            <h2 className="mb-3 font-semibold">Selection Summary</h2>
            <div className="space-y-2 text-sm">{[["Mode", mode], ["Placements", selectedPlacementIds.length], ["Preview", device], ["Output", selectedFormat]].map(([label, value]) => <div key={String(label)} className="flex justify-between rounded-md bg-[#faf9f5] px-3 py-2"><span>{label}</span><span className="font-semibold capitalize">{value}</span></div>)}</div>
          </section>
        </aside>
      </form>

      <footer className="mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-3 border-t border-[#151515]/10 px-5 py-5 text-xs text-[#666]">
        <span>Strictly stateless creative processing / temporary files auto-delete after 24h</span>
        <nav className="flex gap-4"><a href="/terms" className="hover:text-[#151515]">Terms of Service</a><a href="/privacy" className="hover:text-[#151515]">Privacy GDPR/KVKK</a><a href="/refund" className="hover:text-[#151515]">Refund Policy</a><a href="mailto:support@adaptif.ai" className="hover:text-[#151515]">Support</a></nav>
      </footer>
      <ConsentBanner />
    </main>
  );
}
