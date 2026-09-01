import { WebSocket } from 'ws';
import { prisma } from './db';

export interface PairState {
  pairId: string;
  name: string;
  basePrice: number;
  volatility: number;
  payoutPercent: number;
  spread: number;
  currentPrice: number;
  candle: CandleData;
  subscribers: Set<WebSocket>;
}

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TickMessage {
  type: 'tick';
  pairId: string;
  price: number;
  timestamp: number;
  candle: CandleData;
}

export interface CandleCloseMessage {
  type: 'candle:close';
  pairId: string;
  candle: CandleData;
}

const TICK_INTERVAL_MS = 200;
const CANDLE_INTERVAL_MS = 60_000;

export class OTCEngine {
  private pairs = new Map<string, PairState>();
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private candleTimer: ReturnType<typeof setInterval> | null = null;
  private broadcast: ((msg: TickMessage | CandleCloseMessage) => void) | null = null;

  async init() {
    let retries = 10;
    while (retries > 0) {
      try {
        const dbPairs = await prisma.pair.findMany({ where: { isActive: true } });
        if (dbPairs.length === 0) {
          console.log('[OTC] No active pairs found. Running seed...');
          await this.runSeed();
        }
        const pairs = await prisma.pair.findMany({ where: { isActive: true } });
        for (const p of pairs) {
      const basePrice = Number(p.basePrice);
      const volatility = Number(p.volatility);
      const now = Date.now();
      const candleStart = Math.floor(now / CANDLE_INTERVAL_MS) * CANDLE_INTERVAL_MS;

      const state: PairState = {
        pairId: p.id,
        name: p.name,
        basePrice,
        volatility,
        payoutPercent: Number(p.payoutPercent),
        spread: Number(p.spread),
        currentPrice: basePrice,
        candle: {
          timestamp: candleStart,
          open: basePrice,
          high: basePrice,
          low: basePrice,
          close: basePrice,
          volume: 0,
        },
        subscribers: new Set(),
      };

      this.pairs.set(p.id, state);
    }

    await this.seedHistoricalCandles();
        return;
      } catch (e) {
        retries--;
        if (retries <= 0) {
          console.error('[OTC] Failed to init after retries:', e);
          return;
        }
        console.log(`[OTC] DB not ready, retrying in 3s... (${retries} left)`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }

  private async runSeed() {
    try {
      const { execSync } = await import('child_process');
      execSync('npx tsx scripts/seed.ts', { stdio: 'inherit', timeout: 30000 });
    } catch {
      console.log('[OTC] Seed script failed or not found, continuing...');
    }
  }

  private async seedHistoricalCandles() {
    for (const state of Array.from(this.pairs.values())) {
      const existingCount = await prisma.candle.count({
        where: { pairId: state.pairId },
      });

      if (existingCount >= 200) continue;

      const candles: Array<{
        pairId: string;
        timestamp: bigint;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }> = [];

      let price = state.basePrice;
      const now = Date.now();
      const candleStart = Math.floor(now / CANDLE_INTERVAL_MS) * CANDLE_INTERVAL_MS;

      for (let i = 499; i >= 0; i--) {
        const ts = candleStart - i * CANDLE_INTERVAL_MS;
        const open = price;

        const vol = state.volatility;
        const bodySize = (Math.random() * 0.6 + 0.1) * vol;
        const isBullish = Math.random() > 0.48;
        const bodyDir = isBullish ? 1 : -1;
        const close = open + bodyDir * bodySize;
        const maxWick = vol * 0.8;
        const wickUp = Math.random() * maxWick * (isBullish ? 0.6 : 1.0);
        const wickDown = Math.random() * maxWick * (isBullish ? 1.0 : 0.6);
        const high = Math.max(open, close) + wickUp;
        const low = Math.min(open, close) - wickDown;
        const volume = Math.floor(Math.random() * 10000) + 100;

        candles.push({
          pairId: state.pairId,
          timestamp: BigInt(ts),
          open,
          high,
          low,
          close,
          volume,
        });

        const drift = (Math.random() - 0.5) * vol * 0.15;
        price = close + drift;
      }

      await prisma.candle.createMany({ data: candles, skipDuplicates: true });
    }
  }

  setBroadcast(fn: (msg: TickMessage | CandleCloseMessage) => void) {
    this.broadcast = fn;
  }

  start() {
    if (this.tickTimer) return;

    this.tickTimer = setInterval(() => this.generateTicks(), TICK_INTERVAL_MS);
    this.candleTimer = setInterval(() => this.closeCandles(), CANDLE_INTERVAL_MS);
  }

  stop() {
    if (this.tickTimer) { clearInterval(this.tickTimer); this.tickTimer = null; }
    if (this.candleTimer) { clearInterval(this.candleTimer); this.candleTimer = null; }
  }

  private generateTicks() {
    const now = Date.now();

    for (const state of Array.from(this.pairs.values())) {
      const tick = this.generateTick(state, now);

      if (tick) {
        this.broadcastTick(state, tick);
      }
    }
  }

  private generateTick(state: PairState, now: number): TickMessage | null {
    const priceChange = (Math.random() - 0.5) * state.volatility * 0.06;
    const newPrice = Math.max(
      state.basePrice * 0.5,
      Math.min(state.basePrice * 2, state.currentPrice + priceChange)
    );

    state.currentPrice = Number(newPrice.toFixed(8));

    const candle = state.candle;
    candle.close = state.currentPrice;
    candle.high = Math.max(candle.high, state.currentPrice);
    candle.low = Math.min(candle.low, state.currentPrice);
    candle.volume += Math.floor(Math.random() * 50) + 1;

    const msg: TickMessage = {
      type: 'tick',
      pairId: state.pairId,
      price: state.currentPrice,
      timestamp: now,
      candle: { ...candle },
    };

    return msg;
  }

  private broadcastTick(state: PairState, tick: TickMessage) {
    if (this.broadcast) {
      this.broadcast(tick);
    }
  }

  private async closeCandles() {
    const now = Date.now();
    const candleStart = Math.floor(now / CANDLE_INTERVAL_MS) * CANDLE_INTERVAL_MS;

    for (const state of Array.from(this.pairs.values())) {
      const oldCandle = { ...state.candle };

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

      state.candle = {
        timestamp: candleStart,
        open: state.currentPrice,
        high: state.currentPrice,
        low: state.currentPrice,
        close: state.currentPrice,
        volume: 0,
      };

      const closeMsg: CandleCloseMessage = {
        type: 'candle:close',
        pairId: state.pairId,
        candle: oldCandle,
      };

      if (this.broadcast) {
        this.broadcast(closeMsg);
      }
    }
  }

  subscribe(pairId: string, ws: WebSocket) {
    const state = this.pairs.get(pairId);
    if (state) {
      state.subscribers.add(ws);
    }
  }

  unsubscribe(pairId: string, ws: WebSocket) {
    const state = this.pairs.get(pairId);
    if (state) {
      state.subscribers.delete(ws);
    }
  }

  unsubscribeAll(ws: WebSocket) {
    for (const state of Array.from(this.pairs.values())) {
      state.subscribers.delete(ws);
    }
  }

  getPairs() {
    return Array.from(this.pairs.values()).map(s => ({
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

  async ensureHistoricalCandles() {
    await this.seedHistoricalCandles();
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
