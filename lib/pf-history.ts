import { createHash } from 'crypto';
import { prisma } from './db';
import { computeSecond, dayStringUTC, SECONDS_PER_DAY } from './pf-math';
import { s3Get, s3Put, s3KeyForDay, isS3Configured } from './s3';

export interface PfCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function getSeedForDaySync(day: string): string | null {
  return null;
}

export async function generateDayCandles(params: {
  pairId: string;
  day: string;
  intervalMs: number;
  basePrice: number;
  volatility: number;
  category: string;
  seed: string;
  sigmaMults: Map<number, number>;
}): Promise<PfCandle[]> {
  const { pairId, day, intervalMs, basePrice, volatility, category, seed, sigmaMults } = params;
  const startSec = Math.floor(Date.parse(`${day}T00:00:00.000Z`) / 1000);
  const candles: PfCandle[] = [];
  let prevClose = basePrice;
  let bucket: PfCandle | null = null;
  let bucketStart = -1;

  for (let s = 0; s < SECONDS_PER_DAY; s++) {
    const secOfDay = s;
    const tsMs = (startSec + s) * 1000;
    const hour = new Date(tsMs).getUTCHours();
    const sigmaMult = sigmaMults.get(hour) ?? 1;
    const effVol = volatility * sigmaMult;
    const r = computeSecond(seed, pairId, day, secOfDay, prevClose, basePrice, effVol, category, hour);
    const price = r.close;
    const curBucket = Math.floor(tsMs / intervalMs) * intervalMs;
    if (curBucket !== bucketStart) {
      if (bucket) candles.push(bucket);
      bucketStart = curBucket;
      bucket = { timestamp: curBucket, open: prevClose, high: r.high, low: r.low, close: price, volume: 0 };
      bucket!.high = Math.max(r.high, prevClose);
      bucket!.low = Math.min(r.low, prevClose);
    } else if (bucket) {
      bucket.high = Math.max(bucket.high, r.high);
      bucket.low = Math.min(bucket.low, r.low);
      bucket.close = price;
    }
    if (bucket) bucket.volume += 1;
    prevClose = price;
  }
  if (bucket) candles.push(bucket);
  return candles;
}

export async function getDayCandlesWithCache(opts: {
  pairId: string;
  day: string;
  intervalMs: number;
}): Promise<{ candles: PfCandle[]; verified: boolean; source: 'hot' | 's3' | 'generated' }> {
  const { pairId, day, intervalMs } = opts;
  const dayStart = Date.parse(`${day}T00:00:00.000Z`);
  const dayEnd = dayStart + 86400000;

  if (intervalMs >= 60000) {
    const rows = await prisma.candle.findMany({
      where: { pairId, timestamp: { gte: BigInt(dayStart), lt: BigInt(dayEnd) } },
      orderBy: { timestamp: 'asc' },
    });
    if (rows.length > 0) {
      const map = new Map<number, PfCandle>();
      for (const r of rows) {
        const ts = Number(r.timestamp);
        const bucket = Math.floor(ts / intervalMs) * intervalMs;
        const c: PfCandle = { timestamp: Number(r.timestamp), open: Number(r.open), high: Number(r.high), low: Number(r.low), close: Number(r.close), volume: Number(r.volume) };
        if (intervalMs === 60000) {
          map.set(ts, c);
        } else {
          const ex = map.get(bucket);
          if (!ex) map.set(bucket, { timestamp: bucket, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume });
          else {
            ex.high = Math.max(ex.high, c.high);
            ex.low = Math.min(ex.low, c.low);
            ex.close = c.close;
            ex.volume += c.volume;
          }
        }
      }
      const candles = [...map.values()].sort((a, b) => a.timestamp - b.timestamp);
      if (candles.length >= 200) return { candles, verified: true, source: 'hot' };
    }
  } else {
    const rows = await prisma.secondCandle.findMany({
      where: { pairId, timestamp: { gte: BigInt(dayStart), lt: BigInt(dayEnd) } },
      orderBy: { timestamp: 'asc' },
    });
    if (rows.length > 0) {
      const map = new Map<number, PfCandle>();
      for (const r of rows) {
        const ts = Number(r.timestamp);
        const bucket = Math.floor(ts / intervalMs) * intervalMs;
        const c = { open: Number(r.open), high: Number(r.high), low: Number(r.low), close: Number(r.close) };
        const ex = map.get(bucket);
        if (!ex) map.set(bucket, { timestamp: bucket, open: c.open, high: c.high, low: c.low, close: c.close, volume: 1 });
        else {
          ex.high = Math.max(ex.high, c.high);
          ex.low = Math.min(ex.low, c.low);
          ex.close = c.close;
          ex.volume += 1;
        }
      }
      const candles = [...map.values()].sort((a, b) => a.timestamp - b.timestamp);
      if (candles.length >= 200) return { candles, verified: true, source: 'hot' };
    }
  }

  if (isS3Configured()) {
    const key = s3KeyForDay(day, pairId, intervalMs);
    const buf = await s3Get(key);
    if (buf) {
      try {
        const parsed = JSON.parse(buf.toString('utf8')) as PfCandle[];
        if (Array.isArray(parsed) && parsed.length) return { candles: parsed, verified: true, source: 's3' };
      } catch {}
    }
  }

  let pair = await prisma.pair.findUnique({ where: { id: pairId } });
  let seedRow = await prisma.serverSeed.findUnique({ where: { day } });
  if (!seedRow) {
    try {
      const { randomBytes } = await import('crypto');
      const { createHash } = await import('crypto');
      const seed = randomBytes(32).toString('hex');
      const seedHash = createHash('sha256').update(seed, 'utf8').digest('hex');
      seedRow = await prisma.serverSeed.create({ data: { day, seedHash, seed, revealed: false } });
    } catch {}
  }
  if (!pair || !seedRow?.seed) return { candles: [], verified: false, source: 'generated' };
  const regimes = await prisma.pairVolRegime.findMany({ where: { pairId, day } });
  const sigmaMults = new Map<number, number>();
  for (const r of regimes) sigmaMults.set(r.hour, Number(r.sigmaMult));
  const candles = await generateDayCandles({
    pairId,
    day,
    intervalMs,
    basePrice: Number(pair.basePrice),
    volatility: Number(pair.volatility),
    category: pair.category,
    seed: seedRow.seed,
    sigmaMults,
  });
  return { candles, verified: false, source: 'generated' };
}

export function merkleRoot(candles: PfCandle[]): string {
  const h = createHash('sha256');
  for (const c of candles) h.update(`${c.timestamp}:${c.open}:${c.high}:${c.low}:${c.close}:${c.volume}|`);
  return h.digest('hex');
}

export async function archiveDayToS3(day: string, pairId: string, intervalMs: number): Promise<string | null> {
  if (!isS3Configured()) return null;
  const { candles, source } = await getDayCandlesWithCache({ pairId, day, intervalMs });
  if (!candles.length || source !== 'hot') return null;
  const key = s3KeyForDay(day, pairId, intervalMs);
  const root = merkleRoot(candles);
  await s3Put(key, Buffer.from(JSON.stringify(candles)), 'application/json');
  await prisma.candleDayArchive.upsert({
    where: { day_pairId_intervalMs: { day, pairId, intervalMs } },
    create: { day, pairId, intervalMs, merkleRoot: root, s3Key: key, rowCount: candles.length },
    update: { merkleRoot: root, s3Key: key, rowCount: candles.length },
  });
  return key;
}
