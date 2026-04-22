"use client";

import {
  AlertTriangle,
  Brush,
  Check,
  ChevronRight,
  CloudUpload,
  CreditCard,
  Download,
  Eraser,
  FileArchive,
  Languages,
  Loader2,
  LogIn,
  LogOut,
  Move,
  Shield,
  Sparkles,
  Type,
  User,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { languages, outputFormats, Placement, placements } from "@/lib/placements";
import { getSupabaseBrowser, hasSupabaseBrowserConfig } from "@/lib/supabase-client";

type PipelineResult = {
  job_id: string;
  credits_estimated: number;
  outputs: Array<{
    placement_id: string;
    filename: string;
    width: number;
    height: number;
    safe_zone_warnings: string[];
    download_url: string;
  }>;
  extracted_blocks: Array<{
    text: string;
    role: string;
    translate: boolean;
    bbox: [number, number, number, number];
  }>;
  translations: Record<string, string>;
  credits_remaining?: number;
};

const platformOrder = ["META", "TIKTOK", "GOOGLE", "SNAPCHAT", "LINKEDIN", "NATIVE/WEB"];

function overlaps(a: Placement["safeZones"][number], b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function DevicePreview({ placement, overrideText, layerX, layerY, maskOpacity }: { placement: Placement; overrideText: string; layerX: number; layerY: number; maskOpacity: number }) {
  const translatedTextBox = placement.ratio === "9:16"
    ? { x: 9, y: 28, width: 65, height: 24 }
    : { x: 8, y: 30, width: 62, height: 26 };
  const warnings = placement.safeZones.filter((zone) => overlaps(zone, translatedTextBox));
  const aspect = placement.height / placement.width;
  const isVertical = aspect > 1.3;

  return (
    <div className="relative flex min-h-[520px] flex-col items-center justify-center gap-4 bg-[#f3f0e8] p-5 text-[#111111]">
      <div
        className={[
          "relative overflow-hidden border-[10px] bg-[#111111] shadow-2xl",
          placement.device === "desktop" ? "w-full max-w-[520px] rounded-[18px] border-[#242424]" : "w-[260px] rounded-[36px] border-[#111111]",
          isVertical ? "aspect-[9/16]" : "aspect-[16/10]",
        ].join(" ")}
      >
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#f9f4e8_0%,#f0d553_36%,#38b6a6_66%,#181818_100%)]" />
        <div className="absolute left-[8%] top-[12%] h-[18%] w-[28%] rounded-[50%] bg-[#ffffff]/80 blur-[1px]" />
        <div className="absolute bottom-[10%] right-[8%] h-[28%] w-[44%] bg-[#ee4d6a]/80" />
        <div
          className="absolute rounded-md border border-[#111111] bg-white/92 p-3 text-[#111111] shadow-lg"
          style={{
            left: `${translatedTextBox.x + layerX}%`,
            top: `${translatedTextBox.y + layerY}%`,
            width: `${translatedTextBox.width}%`,
            minHeight: `${translatedTextBox.height}%`,
          }}
        >
          <p className="text-[10px] font-semibold uppercase">{overrideText || "[BOLD]Launch faster[/BOLD]"}</p>
          <p className="mt-1 text-[9px] leading-4">Localized CTA fits inside original text bounds.</p>
        </div>

        {placement.safeZones.map((zone) => (
          <div
            key={zone.id}
            className="absolute border border-dashed border-[#ff4d4d] bg-[#ff4d4d]/18"
            style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.width}%`, height: `${zone.height}%` }}
            title={zone.label}
          />
        ))}

        {placement.overlay === "tiktok" && (
          <div className="absolute right-3 top-[42%] grid gap-3 text-white">
            {["Like", "Share", "Audio"].map((item) => (
              <span key={item} className="grid h-8 w-8 place-items-center rounded-full bg-black/45 text-sm">
                {item}
              </span>
            ))}
          </div>
        )}
        {placement.overlay === "instagram" && (
          <>
            <div className="absolute left-4 right-4 top-4 flex items-center justify-between text-[10px] font-semibold text-white">
              <span>@brand</span>
              <span>...</span>
            </div>
            <div className="absolute bottom-4 left-4 right-4 rounded-full bg-white/86 px-4 py-2 text-center text-[10px] font-semibold text-[#111111]">
              Swipe up
            </div>
          </>
        )}
        {placement.overlay === "youtube" && (
          <div className="absolute bottom-3 left-3 right-3 h-8 rounded bg-black/55 text-[10px] text-white">
            <div className="mt-3 h-1 w-full bg-white/30">
              <div className="h-1 w-1/3 bg-[#ff0033]" />
            </div>
          </div>
        )}
        {placement.overlay === "linkedin" && (
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-around bg-white/92 px-3 py-3 text-[10px] font-semibold text-[#1a1a1a]">
            <span>Like</span>
            <span>Comment</span>
            <span>Send</span>
          </div>
        )}
      </div>

      <div className="flex w-full max-w-[606px] items-center justify-between rounded-md bg-[#111111] px-4 py-3 text-xs text-white">
        <span>
          {placement.platform} / {placement.label} / {placement.width}x{placement.height}
        </span>
        <span className={warnings.length ? "text-[#ffcf4a]" : "text-[#7ee1c6]"}>
          {warnings.length ? `${warnings.length} safe-zone warning` : "Safe zone clear"}
        </span>
      </div>
      <div className="h-2 w-full max-w-[606px] rounded-full bg-[#ff4d4d]" style={{ opacity: maskOpacity / 100 }} />
    </div>
  );
}

export function AdaptDashboard() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const supabaseConfigured = hasSupabaseBrowserConfig();
  const [selectedPlacementIds, setSelectedPlacementIds] = useState<string[]>(["meta-stories", "tiktok-in-feed", "gdn-300x250"]);
  const [activePlacementId, setActivePlacementId] = useState("meta-stories");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["DE", "TR", "AR"]);
  const [selectedFormat, setSelectedFormat] = useState("PNG");
  const [files, setFiles] = useState<File[]>([]);
  const [credits, setCredits] = useState(240);
  const [userId, setUserId] = useState(() =>
    typeof window === "undefined" ? "guest@adaptif.ai" : window.localStorage.getItem("adaptifai:user") || "guest@adaptif.ai",
  );
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(!supabaseConfigured);
  const [adminTargetEmail, setAdminTargetEmail] = useState("");
  const [adminAmount, setAdminAmount] = useState(100);
  const [adminAction, setAdminAction] = useState<"add" | "deduct">("add");
  const [adminStatus, setAdminStatus] = useState<string | null>(null);
  const [isAdminUpdating, setIsAdminUpdating] = useState(false);
  const [overrideText, setOverrideText] = useState("[BOLD]Launch faster[/BOLD] with localized ads");
  const [layerX, setLayerX] = useState(0);
  const [layerY, setLayerY] = useState(0);
  const [maskOpacity, setMaskOpacity] = useState(18);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const activePlacement = placements.find((placement) => placement.id === activePlacementId) ?? placements[0];
  const currentUserEmail = authUser?.email ?? userId;
  const isAdmin = currentUserEmail.toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "tolgar@sasmaz.digital").toLowerCase();
  const groupedPlacements = useMemo(
    () => platformOrder.map((platform) => [platform, placements.filter((placement) => placement.platform === platform)] as const),
    [],
  );

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

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    window.localStorage.setItem("adaptifai:user", currentUserEmail);
    fetch(`/api/credits?user_id=${encodeURIComponent(currentUserEmail)}`)
      .then((response) => response.json())
      .then((payload) => setCredits(Number(payload.credits ?? 0)))
      .catch(() => undefined);
  }, [currentUserEmail]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f0d553";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#38b6a6";
    context.fillRect(canvas.width * 0.52, 0, canvas.width * 0.48, canvas.height);
    context.fillStyle = `rgba(255, 77, 77, ${maskOpacity / 100})`;
    context.fillRect(canvas.width * 0.18, canvas.height * 0.25, canvas.width * 0.54, canvas.height * 0.28);
    context.fillStyle = "#111111";
    context.font = "700 16px Arial";
    context.fillText(overrideText.replaceAll("[BOLD]", "").replaceAll("[/BOLD]", "").slice(0, 26), 30 + layerX, 70 + layerY);
  }, [overrideText, layerX, layerY, maskOpacity]);

  const runAdapt = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsRunning(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("user_id", currentUserEmail);
    formData.append("target_languages", selectedLanguages.join(","));
    formData.append("output_format", selectedFormat);
    formData.append("placements", selectedPlacementIds.join(","));

    try {
      const response = await fetch("/api/adapt", { method: "POST", body: formData });
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

  const buyCredits = async () => {
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
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
    const authCall = authMode === "sign-up" ? supabase.auth.signUp : supabase.auth.signInWithPassword;
    const { data, error } = await authCall.bind(supabase.auth)({ email: authEmail, password: authPassword });
    if (error) {
      setAuthError(error.message);
      return;
    }
    if (data.user?.email) setUserId(data.user.email);
    if (authMode === "sign-up" && !data.session) {
      setAuthError("Check your email to confirm the account, then sign in.");
    }
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
    setAuthUser(null);
    setSessionToken(null);
  };

  const adjustCredits = async () => {
    setIsAdminUpdating(true);
    setAdminStatus(null);
    try {
      const response = await fetch("/api/admin/credits", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${sessionToken}`,
        },
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

  if (!authReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#faf9f5] text-[#151515]">
        <Loader2 className="h-7 w-7 animate-spin text-[#0f766e]" />
      </main>
    );
  }

  if (supabaseConfigured && !authUser) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#faf9f5] px-5 text-[#151515]">
        <form onSubmit={submitAuth} className="w-full max-w-sm rounded-md border border-[#151515]/10 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase text-[#0f766e]">AdaptifAI</p>
          <h1 className="mt-1 text-2xl font-semibold">{authMode === "sign-in" ? "Sign in" : "Create account"}</h1>
          <div className="mt-5 space-y-3">
            <label className="block text-sm font-semibold">
              Email
              <input className="mt-1 h-11 w-full rounded-md border border-[#151515]/15 px-3 outline-none focus:border-[#0f766e]" type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} required />
            </label>
            <label className="block text-sm font-semibold">
              Password
              <input className="mt-1 h-11 w-full rounded-md border border-[#151515]/15 px-3 outline-none focus:border-[#0f766e]" type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} required minLength={6} />
            </label>
          </div>
          {authError && <p className="mt-3 rounded-md bg-[#fff0d8] p-3 text-sm text-[#6b3b00]">{authError}</p>}
          <button type="submit" className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#151515] font-semibold text-white">
            <LogIn className="h-4 w-4" />
            {authMode === "sign-in" ? "Sign in" : "Sign up"}
          </button>
          <button type="button" onClick={() => setAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in")} className="mt-3 w-full text-sm font-semibold text-[#0f766e]">
            {authMode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf9f5] text-[#151515]">
      <header className="sticky top-0 z-20 border-b border-[#151515]/10 bg-[#faf9f5]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase text-[#0f766e]">AdaptifAI</p>
            <h1 className="text-xl font-semibold">ADAPT Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex h-10 items-center gap-2 rounded-md border border-[#151515]/15 bg-white px-3 text-sm font-semibold">
              <User className="h-4 w-4 text-[#0f766e]" />
              <input
                className="w-44 bg-transparent outline-none"
                value={currentUserEmail}
                readOnly={supabaseConfigured}
                onChange={(event) => setUserId(event.target.value)}
                aria-label="Account email"
              />
            </label>
            <div className="flex h-10 items-center gap-2 rounded-md border border-[#151515]/15 bg-white px-3 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-[#0f766e]" />
              {credits} credits
            </div>
            <button
              type="button"
              onClick={buyCredits}
              className="flex h-10 items-center gap-2 rounded-md bg-[#151515] px-4 text-sm font-semibold text-white transition hover:bg-[#343434]"
            >
              <CreditCard className="h-4 w-4" />
              Buy credits
            </button>
            {supabaseConfigured && (
              <button type="button" onClick={signOut} className="flex h-10 items-center gap-2 rounded-md border border-[#151515]/15 bg-white px-3 text-sm font-semibold">
                <LogOut className="h-4 w-4 text-[#0f766e]" />
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <form onSubmit={runAdapt} className="mx-auto grid max-w-[1500px] gap-4 px-5 py-5 xl:grid-cols-[360px_minmax(520px,1fr)_360px]">
        <aside className="space-y-4">
          {isAdmin && (
            <section className="rounded-md border border-[#151515]/10 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">Admin Credits</h2>
                <Shield className="h-4 w-4 text-[#0f766e]" />
              </div>
              <label className="block text-sm font-semibold">
                User email
                <input className="mt-1 h-10 w-full rounded-md border border-[#151515]/10 bg-[#faf9f5] px-3 outline-none focus:border-[#0f766e]" type="email" value={adminTargetEmail} onChange={(event) => setAdminTargetEmail(event.target.value)} />
              </label>
              <label className="mt-3 block text-sm font-semibold">
                Credits
                <input className="mt-1 h-10 w-full rounded-md border border-[#151515]/10 bg-[#faf9f5] px-3 outline-none focus:border-[#0f766e]" type="number" min="1" value={adminAmount} onChange={(event) => setAdminAmount(Number(event.target.value))} />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-[#f1eee6] p-1">
                {(["add", "deduct"] as const).map((action) => (
                  <button key={action} type="button" onClick={() => setAdminAction(action)} className={["h-9 rounded text-xs font-semibold capitalize", adminAction === action ? "bg-[#151515] text-white" : "text-[#555555] hover:bg-white"].join(" ")}>
                    {action}
                  </button>
                ))}
              </div>
              <button type="button" onClick={adjustCredits} disabled={isAdminUpdating} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#0f766e] text-sm font-semibold text-white disabled:bg-[#d6d0c4]">
                {isAdminUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                Apply credit change
              </button>
              {adminStatus && <p className="mt-3 rounded-md bg-[#e8f7f1] p-3 text-sm text-[#064e46]">{adminStatus}</p>}
            </section>
          )}

          <section className="rounded-md border border-[#151515]/10 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Inputs</h2>
              <FileArchive className="h-4 w-4 text-[#0f766e]" />
            </div>
            <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-[#151515]/30 bg-[#f6f1e7] p-4 text-center transition hover:border-[#0f766e]">
              <CloudUpload className="mb-3 h-8 w-8 text-[#0f766e]" />
              <span className="text-sm font-semibold">Upload PNG, WebP, JPG, JPEG, PDF or ZIP</span>
              <span className="mt-1 text-xs text-[#595959]">Multiple files supported</span>
              <input
                className="sr-only"
                multiple
                accept=".png,.webp,.jpg,.jpeg,.pdf,.zip"
                type="file"
                onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              />
            </label>
            <div className="mt-3 space-y-2">
              {(files.length ? files : [{ name: "No files selected", size: 0 } as File]).map((file) => (
                <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-md bg-[#faf9f5] px-3 py-2 text-xs">
                  <span className="max-w-[220px] truncate">{file.name}</span>
                  <span>{file.size ? `${Math.ceil(file.size / 1024)} KB` : ""}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-[#151515]/10 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Languages</h2>
              <Languages className="h-4 w-4 text-[#0f766e]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {languages.map((language) => {
                const selected = selectedLanguages.includes(language.code);
                return (
                  <button
                    key={language.code}
                    type="button"
                    onClick={() =>
                      setSelectedLanguages((current) =>
                        selected ? current.filter((code) => code !== language.code) : [...current, language.code],
                      )
                    }
                    className={[
                      "flex h-10 items-center justify-between rounded-md border px-3 text-sm transition",
                      selected ? "border-[#0f766e] bg-[#dff8ef] text-[#064e46]" : "border-[#151515]/10 bg-[#faf9f5]",
                    ].join(" ")}
                  >
                    {language.code}
                    {selected && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-md border border-[#151515]/10 bg-white p-4">
            <h2 className="mb-3 font-semibold">Output Format</h2>
            <div className="grid grid-cols-5 gap-1 rounded-md bg-[#f1eee6] p-1">
              {outputFormats.map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => setSelectedFormat(format)}
                  className={[
                    "h-9 rounded text-xs font-semibold transition",
                    selectedFormat === format ? "bg-[#151515] text-white" : "text-[#555555] hover:bg-white",
                  ].join(" ")}
                >
                  {format}
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="overflow-hidden rounded-md border border-[#151515]/10 bg-white">
          <div className="flex items-center justify-between border-b border-[#151515]/10 px-4 py-3">
            <div>
              <h2 className="font-semibold">Placement & Preview</h2>
              <p className="text-xs text-[#666666]">Real-device frame with platform UI and safe-zone masks</p>
            </div>
            <button
              type="submit"
              disabled={isRunning || selectedLanguages.length === 0 || selectedPlacementIds.length === 0}
              className="flex h-10 min-w-36 items-center justify-center gap-2 rounded-md bg-[#ee4d6a] px-4 text-sm font-semibold text-white transition hover:bg-[#c83d56] disabled:cursor-not-allowed disabled:bg-[#d6d0c4]"
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Run ADAPT
            </button>
          </div>
          <DevicePreview placement={activePlacement} overrideText={overrideText} layerX={layerX} layerY={layerY} maskOpacity={maskOpacity} />
        </section>

        <aside className="space-y-4">
          <section className="rounded-md border border-[#151515]/10 bg-white p-4">
            <h2 className="mb-3 font-semibold">Platforms</h2>
            <div className="max-h-[480px] space-y-4 overflow-auto pr-1">
              {groupedPlacements.map(([platform, items]) => (
                <div key={platform}>
                  <p className="mb-2 text-xs font-semibold uppercase text-[#777777]">{platform}</p>
                  <div className="space-y-2">
                    {items.map((placement) => {
                      const selected = selectedPlacementIds.includes(placement.id);
                      const active = activePlacementId === placement.id;
                      return (
                        <button
                          key={placement.id}
                          type="button"
                          onClick={() => {
                            setActivePlacementId(placement.id);
                            setSelectedPlacementIds((current) =>
                              selected ? current.filter((id) => id !== placement.id) : [...current, placement.id],
                            );
                          }}
                          className={[
                            "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition",
                            active ? "border-[#ee4d6a] bg-[#fff0f3]" : selected ? "border-[#0f766e] bg-[#e8f7f1]" : "border-[#151515]/10 bg-[#faf9f5]",
                          ].join(" ")}
                        >
                          <span>
                            <span className="block font-semibold">{placement.label}</span>
                            <span className="text-xs text-[#666666]">
                              {placement.ratio} / {placement.width}x{placement.height}
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-[#151515]/10 bg-white p-4">
            <h2 className="mb-3 font-semibold">Post-Process Editor</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Brush mask", Brush],
                ["Erase text", Eraser],
                ["Move layer", Move],
                ["Edit copy", Type],
              ].map(([label, Icon]) => (
                <button key={String(label)} type="button" className="flex h-11 items-center gap-2 rounded-md border border-[#151515]/10 bg-[#faf9f5] px-3 text-sm font-semibold">
                  <Icon className="h-4 w-4 text-[#0f766e]" />
                  {String(label)}
                </button>
              ))}
            </div>
            <textarea
              className="mt-3 min-h-24 w-full resize-none rounded-md border border-[#151515]/10 bg-[#faf9f5] p-3 text-sm outline-none focus:border-[#0f766e]"
              value={overrideText}
              onChange={(event) => setOverrideText(event.target.value)}
              aria-label="Manual translation override"
            />
            <div className="mt-3 space-y-2 text-xs font-semibold text-[#555555]">
              <label className="block">
                Layer X
                <input className="w-full accent-[#0f766e]" type="range" min="-20" max="20" value={layerX} onChange={(event) => setLayerX(Number(event.target.value))} />
              </label>
              <label className="block">
                Layer Y
                <input className="w-full accent-[#0f766e]" type="range" min="-20" max="20" value={layerY} onChange={(event) => setLayerY(Number(event.target.value))} />
              </label>
              <label className="block">
                Mask opacity
                <input className="w-full accent-[#ee4d6a]" type="range" min="0" max="70" value={maskOpacity} onChange={(event) => setMaskOpacity(Number(event.target.value))} />
              </label>
            </div>
            <canvas ref={canvasRef} width={300} height={150} className="mt-3 h-auto w-full rounded-md border border-[#151515]/10" />
          </section>

          <section className="rounded-md border border-[#151515]/10 bg-white p-4">
            <h2 className="mb-3 font-semibold">Run Status</h2>
            {error && (
              <div className="mb-3 flex gap-2 rounded-md bg-[#fff0d8] p-3 text-sm text-[#6b3b00]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {result ? (
              <div className="space-y-3 text-sm">
                <div className="rounded-md bg-[#e8f7f1] p-3">
                  Job {result.job_id} completed / {result.outputs.length} exports
                </div>
                <div className="space-y-2">
                  {result.outputs.slice(0, 4).map((output) => (
                    <a key={output.filename} href={output.download_url} className="flex items-center justify-between rounded-md border border-[#151515]/10 px-3 py-2 hover:border-[#0f766e]">
                      <span className="truncate">{output.filename}</span>
                      <Download className="h-4 w-4 text-[#0f766e]" />
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#666666]">
                TrOCR extraction, GPT-4o translation, inpainting and resizing results will appear here.
              </p>
            )}
          </section>
        </aside>
      </form>

      <footer className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 border-t border-[#151515]/10 px-5 py-5 text-xs text-[#666666]">
        <span>Strictly stateless creative processing / temporary files auto-delete after 24h</span>
        <nav className="flex gap-4">
          <a href="/terms" className="hover:text-[#151515]">Terms of Service</a>
          <a href="/privacy" className="hover:text-[#151515]">Privacy GDPR/KVKK</a>
          <a href="/refund" className="hover:text-[#151515]">Refund Policy</a>
          <a href="mailto:support@adaptif.ai" className="hover:text-[#151515]">Support</a>
        </nav>
      </footer>
    </main>
  );
}
