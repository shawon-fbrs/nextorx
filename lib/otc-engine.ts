import { createHash, randomBytes } from "crypto";
import { prisma } from "./db";
import { fetchMirrorQuotes } from "./mirror-feed";
import {
  computeSecond,
  dayStringUTC,
  secondOfDayUTC,
  secondStartMs,
  SECONDS_PER_DAY,
  TICKS_PER_SECOND,
} from "./pf-math";
import type { PairState, CandleData, TickMessage, CandleCloseMessage } from "./otc-types";
import { WebSocket } from "ws";

export type { PairState, CandleData, TickMessage, CandleCloseMessage };

const TICK_INTERVAL_MS = 100;
const CANDLE_INTERVAL_MS = 60_000;
const BACKFILL_15M_SECONDS = 900;

export interface SeedInfo {
  day: string;
  seedHash: string;
  revealed: boolean;
}

export async function ensureSeedForDay(day: string): Promise<SeedInfo> {
  const existing = await prisma.serverSeed.findUnique({ where: { day } });
  if (existing) {
    return { day, seedHash: existing.seedHash, revealed: existing.revealed };
  }
  const seed = randomBytes(32).toString("hex");
  const seedHash = createHash("sha256").update(seed, "utf8").digest("hex");
  const created = await prisma.serverSeed.create({
    data: { day, seedHash, seed, revealed: false },
  });
  return { day, seedHash: created.seedHash, revealed: false };
}

async function getSeedValue(day: string): Promise<string> {
  const info = await ensureSeedForDay(day);
  if (!info) throw new Error("Seed unavailable");
  const row = await prisma.serverSeed.findUnique({ where: { day } });
  if (!row?.seed) throw new Error("Seed unavailable");
  return row.seed;
}

export async function revealDueSeeds(now = new Date()): Promise<string[]> {
  const today = dayStringUTC(now);
  const revealed: string[] = [];
  const pending = await prisma.serverSeed.findMany({ where: { revealed: false } });
  for (const row of pending) {
    if (row.day < today) {
      await prisma.serverSeed.update({
        where: { id: row.id },
        data: { revealed: true, revealedAt: now },
      });
      revealed.push(row.day);
    }
  }
  return revealed;
}

export async function getSeedHash(day: string): Promise<SeedInfo> {
  return ensureSeedForDay(day);
}

export async function getSeedReveal(day: string): Promise<{ day: string; seed: string } | null> {
  const row = await prisma.serverSeed.findUnique({ where: { day } });
  if (!row || !row.revealed || !row.seed) return null;
  return { day, seed: row.seed };
}

export class OTCEngine {
  private pairs = new Map<string, PairState>();
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private candleTimer: ReturnType<typeof setInterval> | null = null;
  private persistTimer: ReturnType<typeof setInterval> | null = null;
  private seedTimer: ReturnType<typeof setInterval> | null = null;
  private broadcast: ((msg: TickMessage | CandleCloseMessage) => void) | null = null;
  private onSeedRevealed: ((day: string, seed: string) => void) | null = null;
  private currentDay = "";
  private currentSeed = "";
  private secondCloses = new Map<string, number>();
  private lastPersistedSecond = 0;
  private anchors = new Map<string, { price: number; fetchedAt: number }>();
  private mirrorTimer: ReturnType<typeof setInterval> | null = null;

  async refreshAnchors() {
    try {
      const quotes = await fetchMirrorQuotes();
      for (const q of quotes) {
        this.anchors.set(q.pairId, { price: q.price, fetchedAt: q.fetchedAt });
      }
      if (quotes.length > 0) {
        console.log(`[OTC] Mirror anchors updated: ${quotes.map((q) => `${q.pairId}=${q.price}`).join(" ")}`);
      }
    } catch (e) {
      console.error("[OTC] Mirror refresh failed, keeping last anchors:", e);
    }
  }

  async init() {
    let retries = 10;
    while (retries > 0) {
      try {
        const now = new Date();
        this.currentDay = dayStringUTC(now);
        this.currentSeed = await getSeedValue(this.currentDay);

        const pairs = await prisma.pair.findMany({ where: { isActive: true } });
        if (pairs.length === 0) {
          console.log("[OTC] No active pairs. Engine running empty — pairs are admin-created.");
        }
        for (const p of pairs) {
          await this.loadPairState(p.id);
        }
        await this.backfillRecentSeconds();
        return;
      } catch (e) {
        retries--;
        if (retries <= 0) {
          console.error("[OTC] Failed to init after retries:", e);
          return;
        }
        console.log(`[OTC] DB not ready, retrying in 3s... (${retries} left)`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  private async loadPairState(pairId: string) {
    const p = await prisma.pair.findUnique({ where: { id: pairId } });
    if (!p || !p.isActive) return;
    const basePrice = Number(p.basePrice);
    const now = Date.now();
    const candleStart = Math.floor(now / CANDLE_INTERVAL_MS) * CANDLE_INTERVAL_MS;
    const lastSecond = await prisma.secondCandle.findFirst({
      where: { pairId },
      orderBy: { timestamp: "desc" },
      select: { close: true },
    });
    const lastMinute = lastSecond
      ? null
      : await prisma.candle.findFirst({
          where: { pairId },
          orderBy: { timestamp: "desc" },
          select: { close: true },
        });
    const startPrice = lastSecond
      ? Number(lastSecond.close)
      : lastMinute
        ? Number(lastMinute.close)
        : basePrice;
    const state: PairState = {
      pairId: p.id,
      name: p.name,
      category: p.category,
      feed: (p as { feed?: string }).feed ?? "synthetic",
      basePrice,
      volatility: Number(p.volatility),
      payoutPercent: Number(p.payoutPercent),
      spread: Number(p.spread),
      currentPrice: startPrice,
      candle: {
        timestamp: candleStart,
        open: startPrice,
        high: startPrice,
        low: startPrice,
        close: startPrice,
        volume: 0,
      },
      subscribers: this.pairs.get(p.id)?.subscribers ?? new Set(),
    };
    this.pairs.set(p.id, state);
    this.secondCloses.set(p.id, startPrice);
  }

  private async backfillRecentSeconds() {
    const now = Date.now();
    const currentSecond = Math.floor(now / 1000);
    const fromSecond = currentSecond - BACKFILL_15M_SECONDS;
    const day = dayStringUTC(new Date(now));
    for (const state of Array.from(this.pairs.values())) {
      if (state.feed === "mirror") continue;
      let prevClose = this.secondCloses.get(state.pairId) ?? state.basePrice;
      const rows: Array<{
        pairId: string;
        timestamp: bigint;
        open: number;
        high: number;
        low: number;
        close: number;
        ticks: number;
      }> = [];
      const startOfDay = Math.floor(Date.parse(`${day}T00:00:00.000Z`) / 1000);
      for (let s = Math.max(fromSecond, startOfDay); s < currentSecond; s++) {
        const secondOfDay = s % SECONDS_PER_DAY;
        const utcHour = new Date(s * 1000).getUTCHours();
        const r = computeSecond(
          this.currentSeed, state.pairId, day, secondOfDay, prevClose,
          state.basePrice, state.volatility, this.categoryOf(state.pairId), utcHour,
        );
        const open = prevClose;
        rows.push({
          pairId: state.pairId,
          timestamp: BigInt(s * 1000),
          open, high: r.high, low: r.low, close: r.close, ticks: TICKS_PER_SECOND,
        });
        prevClose = r.close;
      }
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        await prisma.secondCandle.createMany({ data: batch, skipDuplicates: true });
      }
      this.secondCloses.set(state.pairId, prevClose);
      state.currentPrice = prevClose;
    }
    if (this.pairs.size > 0) console.log("[OTC] Backfilled last 15m of 1s candles");
  }

  private categoryOf(pairId: string): string {
    return this.pairs.get(pairId)?.category ?? "forex";
  }

  setBroadcast(fn: (msg: TickMessage | CandleCloseMessage) => void) {
    this.broadcast = fn;
  }

  setSeedRevealedListener(fn: (day: string, seed: string) => void) {
    this.onSeedRevealed = fn;
  }

  start() {
    if (this.tickTimer) return;
    void this.refreshAnchors();
    this.mirrorTimer = setInterval(() => void this.refreshAnchors(), 60_000);
    this.tickTimer = setInterval(() => void this.generateTicks(), TICK_INTERVAL_MS);
    this.candleTimer = setInterval(() => void this.closeCandles(), CANDLE_INTERVAL_MS);
    this.seedTimer = setInterval(() => void this.checkSeeds(), 30_000);
    console.log("[OTC] PF engine started (100ms deterministic ticks)");
  }

  stop() {
    for (const timer of [this.tickTimer, this.candleTimer, this.persistTimer, this.seedTimer, this.mirrorTimer]) {
      if (timer) clearInterval(timer);
    }
    this.tickTimer = this.candleTimer = this.persistTimer = this.seedTimer = this.mirrorTimer = null;
  }

  private tickIndexInSecond(now: number): number {
    return Math.floor((now % 1000) / TICK_INTERVAL_MS);
  }

  private async generateTicks() {
    const now = Date.now();
    const day = dayStringUTC(new Date(now));
    if (day !== this.currentDay) {
      await this.rolloverDay(day);
    }
    const secondOfDay = secondOfDayUTC(now);
    const idx = this.tickIndexInSecond(now);
    const utcHour = new Date(now).getUTCHours();

    for (const state of Array.from(this.pairs.values())) {
      if (state.feed === "mirror") {
        const anchor = this.anchors.get(state.pairId)?.price;
        const prevClose = this.secondCloses.get(state.pairId) ?? state.currentPrice;
        const r = computeSecond(
          this.currentSeed, state.pairId, day, secondOfDay, prevClose,
          state.basePrice, state.volatility, state.category, utcHour,
          anchor != null ? { anchor } : undefined,
        );
        const price = r.ticks[Math.min(idx, r.ticks.length - 1)];
        state.currentPrice = Number(price.toFixed(8));

        const candle = state.candle;
        candle.close = state.currentPrice;
        if (state.currentPrice > candle.high) candle.high = state.currentPrice;
        if (state.currentPrice < candle.low) candle.low = state.currentPrice;
        candle.volume += 1;

        const secStart = Math.floor(now / 1000) * 1000;
        if (secStart !== this.lastPersistedSecond && this.lastPersistedSecond !== 0) {
          await this.persistSecond(this.lastPersistedSecond, day);
        }
        if (secStart !== this.lastPersistedSecond) {
          this.lastPersistedSecond = secStart;
        }
        if (idx === TICKS_PER_SECOND - 1) {
          this.secondCloses.set(state.pairId, r.close);
        }

        const msg: TickMessage = {
          type: "tick",
          pairId: state.pairId,
          price: state.currentPrice,
          timestamp: now,
          candle: { ...candle },
        };
        if (this.broadcast) this.broadcast(msg);
        continue;
      }
      const prevClose = this.secondCloses.get(state.pairId) ?? state.currentPrice;
      const r = computeSecond(
        this.currentSeed, state.pairId, day, secondOfDay, prevClose,
        state.basePrice, state.volatility, this.categoryOf(state.pairId), utcHour,
      );
      const price = r.ticks[Math.min(idx, r.ticks.length - 1)];
      state.currentPrice = Number(price.toFixed(8));

      const candle = state.candle;
      candle.close = state.currentPrice;
      if (state.currentPrice > candle.high) candle.high = state.currentPrice;
      if (state.currentPrice < candle.low) candle.low = state.currentPrice;
      candle.volume += 1;

      const secStart = Math.floor(now / 1000) * 1000;
      if (secStart !== this.lastPersistedSecond && this.lastPersistedSecond !== 0) {
        await this.persistSecond(this.lastPersistedSecond, day);
      }
      if (secStart !== this.lastPersistedSecond) {
        this.lastPersistedSecond = secStart;
      }
      if (idx === TICKS_PER_SECOND - 1) {
        this.secondCloses.set(state.pairId, r.close);
      }

      const msg: TickMessage = {
        type: "tick",
        pairId: state.pairId,
        price: state.currentPrice,
        timestamp: now,
        candle: { ...candle },
      };
      if (this.broadcast) this.broadcast(msg);
    }
  }

  private async persistSecond(secondStartMs: number, day: string) {
    const secondOfDay = Math.floor(secondStartMs / 1000) % SECONDS_PER_DAY;
    const utcHour = new Date(secondStartMs).getUTCHours();
    const rows = [];
    for (const state of Array.from(this.pairs.values())) {
      const prevClose = this.secondCloses.get(state.pairId) ?? state.basePrice;
      const anchor = state.feed === "mirror" ? this.anchors.get(state.pairId)?.price : undefined;
      const r = computeSecond(
        this.currentSeed, state.pairId, day, secondOfDay, prevClose,
        state.basePrice, state.volatility, state.category, utcHour,
        anchor != null ? { anchor } : undefined,
      );
      rows.push({
        pairId: state.pairId,
        timestamp: BigInt(secondStartMs),
        open: prevClose,
        high: r.high,
        low: r.low,
        close: r.close,
        ticks: TICKS_PER_SECOND,
      });
      this.secondCloses.set(state.pairId, r.close);
    }
    if (rows.length > 0) {
      await prisma.secondCandle.createMany({ data: rows, skipDuplicates: true }).catch(() => {});
    }
  }

  private async rolloverDay(day: string) {
    console.log(`[OTC] Rolling to new trading day ${day}`);
    this.currentDay = day;
    this.currentSeed = await getSeedValue(day);
    this.secondCloses.clear();
    for (const state of Array.from(this.pairs.values())) {
      this.secondCloses.set(state.pairId, state.basePrice);
    }
    const revealed = await revealDueSeeds(new Date());
    for (const revealedDay of revealed) {
      const row = await prisma.serverSeed.findUnique({ where: { day: revealedDay } });
      if (row?.seed && this.onSeedRevealed) this.onSeedRevealed(revealedDay, row.seed);
    }
  }

  private async checkSeeds() {
    try {
      const now = new Date();
      const day = dayStringUTC(now);
      if (day !== this.currentDay) {
        await this.rolloverDay(day);
        return;
      }
      const revealed = await revealDueSeeds(now);
      for (const revealedDay of revealed) {
        const row = await prisma.serverSeed.findUnique({ where: { day: revealedDay } });
        if (row?.seed && this.onSeedRevealed) this.onSeedRevealed(revealedDay, row.seed);
      }
      await prisma.secondCandle.deleteMany({
        where: { timestamp: { lt: BigInt(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
      }).catch(() => {});
      await prisma.candle.deleteMany({
        where: { timestamp: { lt: BigInt(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
      }).catch(() => {});
    } catch (e) {
      console.error("[OTC] Seed check error:", e);
    }
  }

  private async closeCandles() {
    const now = Date.now();
    const candleStart = Math.floor(now / CANDLE_INTERVAL_MS) * CANDLE_INTERVAL_MS;

    for (const state of Array.from(this.pairs.values())) {
      const oldCandle = { ...state.candle };
      const lastClose = state.currentPrice;

      state.candle = {
        timestamp: candleStart,
        open: lastClose,
        high: lastClose,
        low: lastClose,
        close: lastClose,
        volume: 0,
      };

      const closeMsg: CandleCloseMessage = {
        type: "candle:close",
        pairId: state.pairId,
        candle: oldCandle,
      };

      if (this.broadcast) {
        this.broadcast(closeMsg);
      }

      await prisma.candle.create({
        data: {
          pairId: state.pairId,
          timestamp: BigInt(oldCandle.timestamp),
          open: oldCandle.open,
          high: oldCandle.high,
          low: oldCandle.low,
          close: oldCandle.close,
          volume: BigInt(oldCandle.volume),
        },
      }).catch(() => {});
    }
  }

  private async runSeed() {
    console.log("[OTC] Auto-seed disabled. Pairs are admin-created only.");
  }

  private async seedHistoricalCandles() {
    for (const state of Array.from(this.pairs.values())) {
      const existingCount = await prisma.candle.count({ where: { pairId: state.pairId } });
      if (existingCount >= 200) continue;
      await this.seedHistoricalCandlesForPair(state);
    }
  }

  subscribe(pairId: string, ws: WebSocket) {
    const state = this.pairs.get(pairId);
    if (state) state.subscribers.add(ws);
  }

  unsubscribe(pairId: string, ws: WebSocket) {
    const state = this.pairs.get(pairId);
    if (state) state.subscribers.delete(ws);
  }

  unsubscribeAll(ws: WebSocket) {
    for (const state of Array.from(this.pairs.values())) {
      state.subscribers.delete(ws);
    }
  }

  getPairs() {
    return Array.from(this.pairs.values()).map((s) => ({
      pairId: s.pairId,
      name: s.name,
      basePrice: s.basePrice,
      payoutPercent: s.payoutPercent,
      currentPrice: s.currentPrice,
    }));
  }

  getCurrentPrice(pairId: string): number | null {
    return this.pairs.get(pairId)?.currentPrice ?? null;
  }

  getCandle(pairId: string): CandleData | null {
    return this.pairs.get(pairId)?.candle ?? null;
  }

  getSubscribers(pairId: string): Set<WebSocket> | undefined {
    return this.pairs.get(pairId)?.subscribers;
  }

  getSeedInfo(): SeedInfo | null {
    if (!this.currentDay) return null;
    return { day: this.currentDay, seedHash: "", revealed: false };
  }

  async getSeedHash(): Promise<SeedInfo> {
    const info = await getSeedHash(this.currentDay || dayStringUTC(new Date()));
    return info;
  }

  async addPair(pairId: string): Promise<void> {
    if (this.pairs.has(pairId)) return;
    await this.loadPairState(pairId);
    const state = this.pairs.get(pairId);
    if (!state) return;

    const existingCount = await prisma.candle.count({ where: { pairId } });
    if (existingCount < 200) {
      await this.seedHistoricalCandlesForPair(state);
    }

    const lastSecond = await prisma.secondCandle.findFirst({
      where: { pairId },
      orderBy: { timestamp: "desc" },
    });
    const lastCandle = lastSecond
      ? null
      : await prisma.candle.findFirst({
          where: { pairId },
          orderBy: { timestamp: "desc" },
        });
    const anchorCandle = lastSecond ?? lastCandle;
    if (anchorCandle) {
      const closePrice = Number(anchorCandle.close);
      state.currentPrice = closePrice;
      state.candle = {
        timestamp: Number(anchorCandle.timestamp),
        open: closePrice,
        high: closePrice,
        low: closePrice,
        close: closePrice,
        volume: 0,
      };
      this.secondCloses.set(pairId, closePrice);
    }
    console.log(`[OTC] Added pair: ${pairId}`);
  }

  async removePair(pairId: string): Promise<void> {
    const state = this.pairs.get(pairId);
    if (!state) return;
    for (const ws of state.subscribers) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "pair:removed", pairId }));
      }
    }
    this.pairs.delete(pairId);
    this.secondCloses.delete(pairId);
    console.log(`[OTC] Removed pair: ${pairId}`);
  }

  async updatePair(
    pairId: string,
    changes: Partial<Pick<PairState, "volatility" | "payoutPercent" | "spread" | "basePrice" | "feed">> & { isActive?: boolean },
  ): Promise<void> {
    if (changes.isActive === false) {
      await this.removePair(pairId);
      return;
    }
    const state = this.pairs.get(pairId);
    if (!state) return;
    if (changes.volatility !== undefined) state.volatility = changes.volatility;
    if (changes.payoutPercent !== undefined) state.payoutPercent = changes.payoutPercent;
    if (changes.spread !== undefined) state.spread = changes.spread;
    if (changes.feed !== undefined) state.feed = changes.feed;
    if (changes.basePrice !== undefined) {
      state.basePrice = changes.basePrice;
      state.currentPrice = changes.basePrice;
      this.secondCloses.set(pairId, changes.basePrice);
    }
    for (const ws of state.subscribers) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "pair:updated", pairId, changes }));
      }
    }
  }

  async seedHistoricalCandlesForPair(state: PairState) {
    const now = Date.now();
    const candleStart = Math.floor(now / CANDLE_INTERVAL_MS) * CANDLE_INTERVAL_MS;
    const rows: Array<{
      pairId: string;
      timestamp: bigint;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }> = [];
    const day = dayStringUTC(new Date(now));
    const category = this.categoryOf(state.pairId);
    let prevClose = state.basePrice;
    for (let i = 499; i >= 0; i--) {
      const minuteStart = candleStart - i * CANDLE_INTERVAL_MS;
      const lastSecond = Math.floor(minuteStart / 1000) + 59;
      const secondOfDay = lastSecond % SECONDS_PER_DAY;
      const utcHour = new Date(minuteStart).getUTCHours();
      const r = computeSecond(
        this.currentSeed, state.pairId, day, secondOfDay, prevClose,
        state.basePrice, state.volatility, category, utcHour,
      );
      const open = prevClose;
      rows.push({
        pairId: state.pairId,
        timestamp: BigInt(minuteStart),
        open,
        high: Math.max(open, r.close),
        low: Math.min(open, r.close),
        close: r.close,
        volume: 100,
      });
      prevClose = r.close;
    }
    await prisma.candle.createMany({ data: rows, skipDuplicates: true });
  }

  async ensureHistoricalCandles() {
    await this.seedHistoricalCandles();
  }

  async getLastCommittedSecondClose(pairId: string): Promise<number | null> {
    const row = await prisma.secondCandle.findFirst({
      where: { pairId },
      orderBy: { timestamp: "desc" },
      select: { close: true },
    });
    return row ? Number(row.close) : null;
  }
}

let engine: OTCEngine | null = null;

export async function getOTCEngine(): Promise<OTCEngine> {
  if (!engine) {
    engine = new OTCEngine();
    await engine.init();
  }
  return engine;
}
