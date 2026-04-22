import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";

type CreditLedger = {
  users: Record<string, { credits: number; updatedAt: string }>;
  processedSessions: Record<string, string>;
};

const ledgerRoot = process.env.ADAPTIFAI_LEDGER_DIR ?? (process.env.VERCEL ? "/tmp/adaptifai" : join(process.cwd(), ".adaptifai"));
const ledgerPath = join(ledgerRoot, "credits.json");

function readLedger(): CreditLedger {
  try {
    return JSON.parse(readFileSync(ledgerPath, "utf8")) as CreditLedger;
  } catch {
    return { users: {}, processedSessions: {} };
  }
}

function writeLedger(ledger: CreditLedger) {
  mkdirSync(dirname(ledgerPath), { recursive: true });
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
}

export function normalizeUserId(userId: string | null | undefined) {
  const normalized = (userId ?? "guest").trim().toLowerCase();
  return normalized || "guest";
}

export function getCredits(userId: string) {
  const ledger = readLedger();
  return ledger.users[normalizeUserId(userId)]?.credits ?? Number(process.env.ADAPTIFAI_DEMO_CREDITS ?? 240);
}

export function addCredits(userId: string, credits: number, sessionId?: string) {
  const normalized = normalizeUserId(userId);
  const ledger = readLedger();

  if (sessionId && ledger.processedSessions[sessionId]) {
    return ledger.users[normalized]?.credits ?? 0;
  }

  const existing = ledger.users[normalized]?.credits ?? Number(process.env.ADAPTIFAI_DEMO_CREDITS ?? 240);
  ledger.users[normalized] = {
    credits: existing + credits,
    updatedAt: new Date().toISOString(),
  };

  if (sessionId) ledger.processedSessions[sessionId] = normalized;
  writeLedger(ledger);
  return ledger.users[normalized].credits;
}

export function spendCredits(userId: string, credits: number) {
  const normalized = normalizeUserId(userId);
  const ledger = readLedger();
  const existing = ledger.users[normalized]?.credits ?? Number(process.env.ADAPTIFAI_DEMO_CREDITS ?? 240);
  if (existing < credits) return { ok: false, credits: existing };

  ledger.users[normalized] = {
    credits: existing - credits,
    updatedAt: new Date().toISOString(),
  };
  writeLedger(ledger);
  return { ok: true, credits: ledger.users[normalized].credits };
}
