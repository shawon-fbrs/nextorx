import { prisma } from "@/lib/db";
import { settleTradeById } from "@/lib/settle-trade";

const POLL_INTERVAL_MS = 1000;
const BATCH_SIZE = 100;

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;
let paused = false;
let lastRunAt: Date | null = null;
let lastSettled = 0;
let lastError: string | null = null;

export function isSettlementPaused(): boolean {
  return paused;
}

export function setSettlementPaused(value: boolean): void {
  paused = value;
  console.log(`[Settlement] ${value ? "PAUSED by admin" : "RESUMED by admin"}`);
}

export function getSettlementStatus(): {
  paused: boolean;
  lastRunAt: Date | null;
  lastSettled: number;
  lastError: string | null;
} {
  return { paused, lastRunAt, lastSettled, lastError };
}

export async function getSettlementBacklog(): Promise<number> {
  const now = Date.now();
  const actives = await prisma.trade.findMany({
    where: { status: "ACTIVE" },
    select: { createdAt: true, durationSeconds: true },
  });
  return actives.filter(
    (t) => new Date(t.createdAt).getTime() + t.durationSeconds * 1000 <= now,
  ).length;
}

async function tick(): Promise<void> {
  if (running || paused) return;
  running = true;
  try {
    const actives = await prisma.trade.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      take: BATCH_SIZE,
      select: { id: true, createdAt: true, durationSeconds: true },
    });
    const now = Date.now();
    let settled = 0;
    for (const t of actives) {
      if (new Date(t.createdAt).getTime() + t.durationSeconds * 1000 <= now) {
        const ok = await settleTradeById(t.id);
        if (ok) settled++;
      }
    }
    lastSettled = settled;
    lastError = null;
  } catch (e) {
    lastError = e instanceof Error ? e.message : "unknown error";
    console.error("[Settlement] Tick error:", lastError);
  } finally {
    running = false;
    lastRunAt = new Date();
  }
}

export function startSettlementWorker(): void {
  if (timer) return;
  timer = setInterval(() => void tick(), POLL_INTERVAL_MS);
  console.log("[Settlement] Worker started (1s poll, batch 100)");
}

export function stopSettlementWorker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  console.log("[Settlement] Worker stopped");
}
