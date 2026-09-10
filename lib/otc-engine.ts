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
  const { ensureSeedDay } = await import("./seeds");
  return ensureSeedDay(day);
}

async function getSeedValue(day: string): Promise<string> {
  const { getDaySeed } = await import("./seeds");
  await ensureSeedForDay(day);
  const seed = await getDaySeed(day);
  if (!seed) throw new Error("Seed unavailable");
  return seed;
}

export async function revealDueSeeds(now = new Date()): Promise<string[]> {
  const { revealDueSeeds: reveal } = await import("./seeds");
  return reveal(now);
}

export async function getSeedHash(day: string): Promise<SeedInfo> {
  return ensureSeedForDay(day);
}

export async function getSeedReveal(day: string): Promise<{ day: string; seed: string } | null> {
  const { getDaySeedReveal } = await import("./seeds");
  return getDaySeedReveal(day);
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
  private pendingSeconds = new Map<string, { timestamp: bigint; open: number; high: number; low: number; close: number }>();
  private lastPersistedSecond = 0;
  private ticking = false;
  private anchors = new Map<string, { price: number; fetchedAt: number }>();
  private mirrorTimer: ReturnType<typeof setInterval> | null = null;
  private regimes = new Map<string, number>();
  private lastMeasuredHour = -1;

  private regimeKey(pairId: string, day: string, hour: number): string {
    return `${pairId}:${day}:${hour}`;
  }

  private regimeMult(pairId: string, day: string, hour: number): number {
    return this.regimes.get(this.regimeKey(pairId, day, hour)) ?? 1;
  }

  private effVol(state: PairState, day: string, hour: number): number {
    return state.volatility * this.regimeMult(state.pairId, day, hour);
  }

  async refreshRegimes(day?: string) {
    try {
      const targetDay = day ?? dayStringUTC(new Date());
      const rows = await prisma.pairVolRegime.findMany({ where: { day: targetDay } });
      for (const row of rows) {
        this.regimes.set(this.regimeKey(row.pairId, row.day, row.hour), Number(row.sigmaMult));
      }
    } catch (e) {
      console.error("[OTC] Regime refresh failed:", e);
    }
  }

  async measureRegimes(now = new Date()) {
    if (!this.hasMirrorPairs()) return;
    const { measureRealizedSigma } = await import("./mirror-feed");
    const day = dayStringUTC(now);
    const hour = now.getUTCHours();
    if (hour === this.lastMeasuredHour) return;
    this.lastMeasuredHour = hour;
    for (const state of Array.from(this.pairs.values())) {
      if (state.feed !== "mirror") continue;
      try {
        const stored = await prisma.pairVolRegime.findUnique({
          where: { pairId_day_hour: { pairId: state.pairId, day, hour } },
        }).catch(() => null);
        if (stored) {
          this.regimes.set(this.regimeKey(state.pairId, day, hour), Number(stored.sigmaMult));
          continue;
        }
        const realized = await measureRealizedSigma(state.pairId);
        if (realized == null || realized <= 0) continue;
        const typical = state.volatility * 0.00008 * 60;
        const mult = Math.max(0.5, Math.min(3, realized / typical));
        try {
          await prisma.pairVolRegime.upsert({
            where: { pairId_day_hour: { pairId: state.pairId, day, hour } },
            create: { pairId: state.pairId, day, hour, sigmaMult: mult, measuredAt: now },
            update: {},
          });
        } catch {
          const winner = await prisma.pairVolRegime.findUnique({
            where: { pairId_day_hour: { pairId: state.pairId, day, hour } },
          }).catch(() => null);
          if (winner) {
            this.regimes.set(this.regimeKey(state.pairId, day, hour), Number(winner.sigmaMult));
            continue;
          }
        }
        this.regimes.set(this.regimeKey(state.pairId, day, hour), mult);
        console.log(`[OTC] Regime ${state.pairId} ${day}h${hour}: x${mult.toFixed(2)}`);
      } catch (e) {
        console.error(`[OTC] Regime measure failed for ${state.pairId}:`, e);
      }
    }
  }

  private hasMirrorPairs(): boolean {
    for (const state of this.pairs.values()) {
      if (state.feed === "mirror") return true;
    }
    return false;
  }

  async refreshAnchors() {
    if (!this.hasMirrorPairs()) return;
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
        await this.refreshAnchors();
        await this.refreshRegimes(this.currentDay);
        await this.measureRegimes(now);
        void this.backfillRecentSeconds().then(() => {
          console.log("[OTC] Full-day backfill complete");
        }).catch((e) => {
          console.error("[OTC] Full-day backfill failed:", e);
        });
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
    let startPrice = lastSecond
      ? Number(lastSecond.close)
      : lastMinute
        ? Number(lastMinute.close)
        : basePrice;
    if (!lastSecond && !lastMinute) {
      try {
        const day = dayStringUTC(new Date(now));
        const { getDaySeed } = await import("./seeds");
        const seedValue = await getDaySeed(day);
        if (seedValue) {
          const regimes = await prisma.pairVolRegime.findMany({ where: { pairId, day } });
          const sigmaMults = new Map<number, { mult: number; fromMs: number }>();
          for (const r of regimes) sigmaMults.set(r.hour, { mult: Number(r.sigmaMult), fromMs: new Date(r.measuredAt).getTime() });
          const { computeCloseUpToNow } = await import("./pf-history");
          const startSec = Math.floor(Date.parse(`${day}T00:00:00.000Z`) / 1000);
          const upTo = Math.max(0, Math.min(SECONDS_PER_DAY, Math.floor(now / 1000) - startSec));
          if (upTo > 0) {
            startPrice = await computeCloseUpToNow({
              pairId,
              day,
              basePrice,
              volatility: Number(p.volatility),
              category: p.category,
              seed: seedValue,
              sigmaMults,
              upToSecond: upTo,
            });
          }
        }
      } catch {}
    }
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
    const day = dayStringUTC(new Date(now));
    const startOfDay = Math.floor(Date.parse(`${day}T00:00:00.000Z`) / 1000);
    const fromSecond = startOfDay;
    for (const state of Array.from(this.pairs.values())) {
      const existingCount = await prisma.secondCandle.count({
        where: { pairId: state.pairId, timestamp: { gte: BigInt(startOfDay * 1000) } },
      }).catch(() => 0);
      const expected = Math.max(0, currentSecond - startOfDay);
      if (existingCount >= expected * 0.9 && expected > 60) {
        console.log(`[OTC] Backfill skip ${state.pairId}: ${existingCount}/${expected} present`);
        continue;
      }
      let prevClose = state.basePrice;
      const rows: Array<{
        pairId: string;
        timestamp: bigint;
        open: number;
        high: number;
        low: number;
        close: number;
        ticks: number;
      }> = [];
      for (let s = Math.max(fromSecond, startOfDay); s < currentSecond; s++) {
        const secondOfDay = s % SECONDS_PER_DAY;
        const utcHour = new Date(s * 1000).getUTCHours();
        const r = computeSecond(
          this.currentSeed, state.pairId, day, secondOfDay, prevClose,
          state.basePrice, this.effVol(state, day, utcHour), this.categoryOf(state.pairId), utcHour,
        );
        const open = prevClose;
        rows.push({
          pairId: state.pairId,
          timestamp: BigInt(s * 1000),
          open, high: r.high, low: r.low, close: r.close, ticks: TICKS_PER_SECOND,
        });
        prevClose = r.close;
        if ((rows.length & 4095) === 4095) {
          await new Promise((r2) => setImmediate(r2));
        }
      }
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        await prisma.secondCandle.createMany({ data: batch, skipDuplicates: true });
        await new Promise((r2) => setImmediate(r2));
      }
      console.log(`[OTC] Backfilled ${rows.length} 1s candles for ${state.pairId}`);
      await this.backfillMinutes(state.pairId, day, startOfDay, currentSecond);
    }
  }

  private async backfillMinutes(pairId: string, day: string, startOfDaySec: number, currentSecond: number) {
    try {
      const fromMs = startOfDaySec * 1000;
      const toMs = currentSecond * 1000;
      const [secs, existing] = await Promise.all([
        prisma.secondCandle.findMany({
          where: { pairId, timestamp: { gte: BigInt(fromMs), lt: BigInt(toMs) } },
          orderBy: { timestamp: "asc" },
          select: { timestamp: true, open: true, high: true, low: true, close: true },
        }),
        prisma.candle.findMany({
          where: { pairId, timestamp: { gte: BigInt(fromMs), lt: BigInt(toMs) } },
          select: { timestamp: true },
        }),
      ]);
      const have = new Set(existing.map((e: { timestamp: bigint }) => Number(e.timestamp)));
      const buckets = new Map<number, { open: number; high: number; low: number; close: number; n: number }>();
      for (const s of secs) {
        const ts = Number(s.timestamp);
        const bucket = Math.floor(ts / CANDLE_INTERVAL_MS) * CANDLE_INTERVAL_MS;
        if (bucket + CANDLE_INTERVAL_MS > toMs) continue;
        const ex = buckets.get(bucket);
        const o = Number(s.open);
        const h = Number(s.high);
        const l = Number(s.low);
        const c = Number(s.close);
        if (!ex) buckets.set(bucket, { open: o, high: h, low: l, close: c, n: 1 });
        else {
          if (h > ex.high) ex.high = h;
          if (l < ex.low) ex.low = l;
          ex.close = c;
          ex.n += 1;
        }
      }
      let written = 0;
      const state = this.pairs.get(pairId);
      for (const [minuteStart, b] of buckets) {
        if (have.has(minuteStart) || b.n < 55) continue;
        const vol = 250 + (minuteStart % 7) * 40 + ((state?.pairId.charCodeAt(0) ?? 0) % 11) * 7 + b.n * 3;
        await prisma.candle.upsert({
          where: { pairId_timestamp: { pairId, timestamp: BigInt(minuteStart) } },
          create: { pairId, timestamp: BigInt(minuteStart), open: b.open, high: b.high, low: b.low, close: b.close, volume: BigInt(vol) },
          update: { open: b.open, high: b.high, low: b.low, close: b.close, volume: BigInt(vol) },
        });
        written++;
        if ((written & 127) === 127) await new Promise((r2) => setImmediate(r2));
      }
      if (written > 0) console.log(`[OTC] Backfilled ${written} 1m candles for ${pairId}`);
    } catch (e) {
      console.error(`[OTC] Minute backfill failed for ${pairId}:`, e instanceof Error ? e.message : e);
    }
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
    if (!this.currentSeed) {
      throw new Error("OTC engine has no seed — refusing to start rather than generating uncommitted prices");
    }
    if (this.hasMirrorPairs()) {
      void this.refreshAnchors();
      this.mirrorTimer = setInterval(() => void this.refreshAnchors(), 60_000);
    } else {
      console.log("[OTC] No mirror pairs — external market feed disabled, engine fully offline");
    }
    this.tickTimer = setInterval(() => void this.generateTicks(), TICK_INTERVAL_MS);
    this.scheduleNextCandleClose();
    this.seedTimer = setInterval(() => void this.checkSeeds(), 30_000);
    console.log("[OTC] PF engine started (100ms deterministic ticks)");
  }

  private scheduleNextCandleClose() {
    const now = Date.now();
    const delay = CANDLE_INTERVAL_MS - (now % CANDLE_INTERVAL_MS) + 5;
    this.candleTimer = setTimeout(() => {
      void this.closeCandles().finally(() => this.scheduleNextCandleClose());
    }, delay) as unknown as ReturnType<typeof setInterval>;
  }

  stop() {
    for (const timer of [this.tickTimer, this.persistTimer, this.seedTimer, this.mirrorTimer]) {
      if (timer) clearInterval(timer);
    }
    if (this.candleTimer) {
      clearTimeout(this.candleTimer as unknown as NodeJS.Timeout);
      clearInterval(this.candleTimer);
    }
    this.tickTimer = this.candleTimer = this.persistTimer = this.seedTimer = this.mirrorTimer = null;
  }

  private tickIndexInSecond(now: number): number {
    return Math.floor((now % 1000) / TICK_INTERVAL_MS);
  }

  private async generateTicks() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      await this.generateTicksInner();
    } finally {
      this.ticking = false;
    }
  }

  private async generateTicksInner() {
    const now = Date.now();
    const day = dayStringUTC(new Date(now));
    if (day !== this.currentDay) {
      await this.rolloverDay(day);
    }
    const secondOfDay = secondOfDayUTC(now);
    const idx = this.tickIndexInSecond(now);
    const utcHour = new Date(now).getUTCHours();

    for (const state of Array.from(this.pairs.values())) {
      const prevClose = this.secondCloses.get(state.pairId) ?? state.currentPrice;
      const r = computeSecond(
        this.currentSeed, state.pairId, day, secondOfDay, prevClose,
        state.basePrice, this.effVol(state, day, utcHour), state.category, utcHour,
      );
      const price = r.ticks[Math.min(idx, r.ticks.length - 1)];
      state.currentPrice = Number(price.toFixed(8));

      const candle = state.candle;
      candle.close = state.currentPrice;
      if (state.currentPrice > candle.high) candle.high = state.currentPrice;
      if (state.currentPrice < candle.low) candle.low = state.currentPrice;
      if (idx === 0) candle.volume += 2 + (r.volume % 6);

      const secStart = Math.floor(now / 1000) * 1000;
      if (secStart !== this.lastPersistedSecond && this.lastPersistedSecond !== 0) {
        await this.persistSecond(this.lastPersistedSecond);
      }
      if (secStart !== this.lastPersistedSecond) {
        this.lastPersistedSecond = secStart;
      }
      if (idx === TICKS_PER_SECOND - 1) {
        const secStartMs = Math.floor(now / 1000) * 1000;
        this.pendingSeconds.set(state.pairId, {
          timestamp: BigInt(secStartMs),
          open: prevClose,
          high: r.high,
          low: r.low,
          close: r.close,
        });
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

  private async persistSecond(secondStartMs: number) {
    if (this.pendingSeconds.size === 0) return;
    const rows: Array<{
      pairId: string;
      timestamp: bigint;
      open: number;
      high: number;
      low: number;
      close: number;
      ticks: number;
    }> = [];
    for (const [pairId, p] of Array.from(this.pendingSeconds.entries())) {
      if (Number(p.timestamp) !== secondStartMs) continue;
      rows.push({
        pairId,
        timestamp: p.timestamp,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
        ticks: TICKS_PER_SECOND,
      });
      this.pendingSeconds.delete(pairId);
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
    this.regimes.clear();
    await this.refreshAnchors();
    for (const state of Array.from(this.pairs.values())) {
      if (state.feed === "mirror") {
        const anchor = this.anchors.get(state.pairId)?.price;
        if (anchor != null && anchor > 0) {
          state.basePrice = anchor;
          await prisma.pair.update({
            where: { id: state.pairId },
            data: { basePrice: anchor },
          }).catch(() => {});
        }
      }
      this.secondCloses.set(state.pairId, state.basePrice);
    }
    await this.refreshRegimes(day);
    await this.measureRegimes(new Date());
    const revealed = await revealDueSeeds(new Date());
    for (const revealedDay of revealed) {
      const { getDaySeed } = await import("./seeds");
      const seedValue = await getDaySeed(revealedDay);
      if (seedValue && this.onSeedRevealed) this.onSeedRevealed(revealedDay, seedValue);
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
        const { getDaySeed } = await import("./seeds");
        const seedValue = await getDaySeed(revealedDay);
        if (seedValue && this.onSeedRevealed) this.onSeedRevealed(revealedDay, seedValue);
      }
      await this.measureRegimes(now);
      try {
        const archiveDay = dayStringUTC(new Date(now.getTime() - 31 * 86400000));
        const { archiveDayToS3 } = await import('./pf-history');
        for (const state of Array.from(this.pairs.values())) {
          await archiveDayToS3(archiveDay, state.pairId, 60000).catch(() => {});
        }
      } catch {}
      await prisma.secondCandle.deleteMany({
        where: { timestamp: { lt: BigInt(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
      }).catch(() => {});
      await prisma.candle.deleteMany({
        where: { timestamp: { lt: BigInt(now.getTime() - 32 * 24 * 60 * 60 * 1000) } },
      }).catch(() => {});
    } catch (e) {
      console.error("[OTC] Seed check error:", e);
    }
  }

  private async closeCandles() {
    const now = Date.now();
    const candleStart = Math.floor(now / CANDLE_INTERVAL_MS) * CANDLE_INTERVAL_MS;
    const closed = new Map<string, { timestamp: number; open: number; high: number; low: number; close: number; volume: number }>();

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
      closed.set(state.pairId, oldCandle);
    }

    await this.rollupMinute(candleStart - CANDLE_INTERVAL_MS, closed);
  }

  private async rollupMinute(minuteStart: number, closed?: Map<string, { timestamp: number; open: number; high: number; low: number; close: number; volume: number }>) {
    // Wait briefly for the 60 second rows to land (persistSecond is async inside ticks).
    for (let attempt = 0; attempt < 3; attempt++) {
      const probe = await prisma.secondCandle.count({
        where: {
          timestamp: { gte: BigInt(minuteStart), lt: BigInt(minuteStart + CANDLE_INTERVAL_MS) },
        },
      });
      if (probe >= 55) break;
      await new Promise((r) => setTimeout(r, 400));
    }
    for (const state of Array.from(this.pairs.values())) {
      try {
        const rows = await prisma.secondCandle.findMany({
          where: {
            pairId: state.pairId,
            timestamp: { gte: BigInt(minuteStart), lt: BigInt(minuteStart + CANDLE_INTERVAL_MS) },
          },
          orderBy: { timestamp: "asc" },
          select: { open: true, high: true, low: true, close: true },
        });
        if (rows.length === 0) {
          const mem = closed?.get(state.pairId);
          if (mem && Number.isFinite(mem.open) && Number.isFinite(mem.close)) {
            const vol = 250 + (minuteStart % 7) * 40 + (state.pairId.charCodeAt(0) % 11) * 7 + 180;
            await prisma.candle.upsert({
              where: { pairId_timestamp: { pairId: state.pairId, timestamp: BigInt(minuteStart) } },
              create: {
                pairId: state.pairId,
                timestamp: BigInt(minuteStart),
                open: mem.open,
                high: mem.high,
                low: mem.low,
                close: mem.close,
                volume: BigInt(vol),
              },
              update: {
                open: mem.open,
                high: mem.high,
                low: mem.low,
                close: mem.close,
                volume: BigInt(vol),
              },
            });
          }
          continue;
        }
        let high = Number(rows[0].high);
        let low = Number(rows[0].low);
        for (const r of rows) {
          const h = Number(r.high);
          const l = Number(r.low);
          if (h > high) high = h;
          if (l < low) low = l;
        }
        const vol = 250 + (minuteStart % 7) * 40 + (state.pairId.charCodeAt(0) % 11) * 7 + (rows.length * 3);
        await prisma.candle.upsert({
          where: { pairId_timestamp: { pairId: state.pairId, timestamp: BigInt(minuteStart) } },
          create: {
            pairId: state.pairId,
            timestamp: BigInt(minuteStart),
            open: Number(rows[0].open),
            high,
            low,
            close: Number(rows[rows.length - 1].close),
            volume: BigInt(vol),
          },
          update: {
            open: Number(rows[0].open),
            high,
            low,
            close: Number(rows[rows.length - 1].close),
            volume: BigInt(vol),
          },
        });
      } catch {}
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
    const day = dayStringUTC(new Date(now));
    const category = state.category;
    const targetEnd = state.currentPrice;

    const runChain = (start: number) => {
      let prevClose = start;
      let end = start;
      for (let i = 499; i >= 0; i--) {
        const minuteStart = candleStart - i * CANDLE_INTERVAL_MS;
        const lastSecond = Math.floor(minuteStart / 1000) + 59;
        const secondOfDay = lastSecond % SECONDS_PER_DAY;
        const utcHour = new Date(minuteStart).getUTCHours();
        const r = computeSecond(
          this.currentSeed, state.pairId, day, secondOfDay, prevClose,
          state.basePrice, this.effVol(state, day, utcHour), category, utcHour,
        );
        prevClose = r.close;
        end = r.close;
      }
      return end;
    };

    const trialEnd = runChain(state.basePrice);
    const factor = trialEnd / state.basePrice;
    const adjustedStart = trialEnd === 0 ? targetEnd : targetEnd / factor;

    const rows: Array<{
      pairId: string;
      timestamp: bigint;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }> = [];
    let prevClose = adjustedStart;
    for (let i = 499; i >= 0; i--) {
      const minuteStart = candleStart - i * CANDLE_INTERVAL_MS;
      const lastSecond = Math.floor(minuteStart / 1000) + 59;
      const secondOfDay = lastSecond % SECONDS_PER_DAY;
      const utcHour = new Date(minuteStart).getUTCHours();
      const r = computeSecond(
        this.currentSeed, state.pairId, day, secondOfDay, prevClose,
        state.basePrice, this.effVol(state, day, utcHour), category, utcHour,
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
