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
          console.log('[OTC] No active pairs. Engine running empty — pairs are admin-created.');
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

    for (const state of Array.from(this.pairs.values())) {
      const lastCandle = await prisma.candle.findFirst({
        where: { pairId: state.pairId },
        orderBy: { timestamp: 'desc' },
      });
      if (lastCandle) {
        const closePrice = Number(lastCandle.close);
        state.currentPrice = closePrice;
        state.candle = {
          timestamp: Number(lastCandle.timestamp),
          open: closePrice,
          high: closePrice,
          low: closePrice,
          close: closePrice,
          volume: 0,
        };
      }
    }
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
    console.log('[OTC] Auto-seed disabled. Pairs are admin-created only.');
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
        const r = (v: number) => Math.round(v * 1e8) / 1e8;
        const open = Math.max(0.00000001, r(price));

        const vol = state.volatility;
        const bodySize = open * (Math.random() * 0.6 + 0.1) * vol * 0.002;
        const isBullish = Math.random() > 0.48;
        const bodyDir = isBullish ? 1 : -1;
        const close = Math.max(0.00000001, r(open + bodyDir * bodySize));
        const maxWick = open * vol * 0.0016;
        const wickUp = Math.random() * maxWick * (isBullish ? 0.6 : 1.0);
        const wickDown = Math.random() * maxWick * (isBullish ? 1.0 : 0.6);
        const high = r(Math.max(open, close) + wickUp);
        const low = Math.max(0.00000001, r(Math.min(open, close) - wickDown));
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

        const drift = close * (Math.random() - 0.5) * vol * 0.0003;
        price = Math.max(state.basePrice * 0.5, Math.min(state.basePrice * 2, r(close + drift)));
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
    // TRACK-B B1: UNCALIBRATED hand-tuned random walk. Quant calibration
    // (O-U + GARCH fitted to real tick data) replaces this before L5.
    const relativeChange = (Math.random() - 0.5) * state.volatility * 0.0006;
    const newPrice = Math.max(
      state.basePrice * 0.5,
      Math.min(state.basePrice * 2, state.currentPrice * (1 + relativeChange))
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
        type: 'candle:close',
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

  async addPair(pairId: string): Promise<void> {
    if (this.pairs.has(pairId)) return;

    const p = await prisma.pair.findUnique({ where: { id: pairId } });
    if (!p || !p.isActive) return;

    const basePrice = Number(p.basePrice);
    const now = Date.now();
    const candleStart = Math.floor(now / CANDLE_INTERVAL_MS) * CANDLE_INTERVAL_MS;

    const state: PairState = {
      pairId: p.id,
      name: p.name,
      basePrice,
      volatility: Number(p.volatility),
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

    const existingCount = await prisma.candle.count({ where: { pairId } });
    if (existingCount < 200) {
      await this.seedHistoricalCandlesForPair(state);
    }

    const lastCandle = await prisma.candle.findFirst({
      where: { pairId },
      orderBy: { timestamp: 'desc' },
    });
    if (lastCandle) {
      const closePrice = Number(lastCandle.close);
      state.currentPrice = closePrice;
      state.candle = {
        timestamp: Number(lastCandle.timestamp),
        open: closePrice,
        high: closePrice,
        low: closePrice,
        close: closePrice,
        volume: 0,
      };
    }

    console.log(`[OTC] Added pair: ${pairId}`);
  }

  async removePair(pairId: string): Promise<void> {
    const state = this.pairs.get(pairId);
    if (!state) return;

    for (const ws of state.subscribers) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'pair:removed', pairId }));
      }
    }

    this.pairs.delete(pairId);
    console.log(`[OTC] Removed pair: ${pairId}`);
  }

  async updatePair(pairId: string, changes: Partial<Pick<PairState, 'volatility' | 'payoutPercent' | 'spread' | 'basePrice'>> & { isActive?: boolean }): Promise<void> {
    if (changes.isActive === false) {
      await this.removePair(pairId);
      return;
    }

    const state = this.pairs.get(pairId);
    if (!state) return;

    if (changes.volatility !== undefined) state.volatility = changes.volatility;
    if (changes.payoutPercent !== undefined) state.payoutPercent = changes.payoutPercent;
    if (changes.spread !== undefined) state.spread = changes.spread;
    if (changes.basePrice !== undefined) {
      state.basePrice = changes.basePrice;
      state.currentPrice = changes.basePrice;
    }

    for (const ws of state.subscribers) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'pair:updated', pairId, changes }));
      }
    }
  }

  private async seedHistoricalCandlesForPair(state: PairState) {
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
      const r = (v: number) => Math.round(v * 1e8) / 1e8;
      const open = Math.max(0.00000001, r(price));

      const vol = state.volatility;
      const bodySize = (Math.random() * 0.6 + 0.1) * vol;
      const isBullish = Math.random() > 0.48;
      const bodyDir = isBullish ? 1 : -1;
      const close = Math.max(0.00000001, r(open + bodyDir * bodySize));
      const maxWick = vol * 0.8;
      const wickUp = Math.random() * maxWick * (isBullish ? 0.6 : 1.0);
      const wickDown = Math.random() * maxWick * (isBullish ? 1.0 : 0.6);
      const high = r(Math.max(open, close) + wickUp);
      const low = Math.max(0.00000001, r(Math.min(open, close) - wickDown));
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
      price = Math.max(state.basePrice * 0.5, Math.min(state.basePrice * 2, r(close + drift)));
    }

    await prisma.candle.createMany({ data: candles, skipDuplicates: true });
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
