import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { toJsonError, ApiError } from '@/lib/api';
import { getDayCandlesWithCache, merkleRoot } from '@/lib/pf-history';
import { getDaySeedReveal } from '@/lib/seeds';

export async function GET(request: NextRequest) {
  try {
    const pairId = request.nextUrl.searchParams.get('pairId');
    const day = request.nextUrl.searchParams.get('day');
    const interval = request.nextUrl.searchParams.get('interval') ?? '1m';
    if (!pairId || !day) throw new ApiError(400, 'pairId and day required');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new ApiError(400, 'Invalid day YYYY-MM-DD');
    const INTERVAL_MS_MAP: Record<string, number> = { "5s": 5_000, "30s": 30_000, "1m": 60_000, "5m": 300_000, "10m": 600_000, "15m": 900_000, "30m": 1_800_000, "1h": 3_600_000, "4h": 14_400_000 };
    if (!(interval in INTERVAL_MS_MAP)) throw new ApiError(400, 'Invalid interval');
    const intervalMs = INTERVAL_MS_MAP[interval];
    const seedRow = await prisma.serverSeed.findUnique({ where: { day } });
    if (!seedRow) throw new ApiError(404, 'Seed not found for day');
    const reveal = await getDaySeedReveal(day);
    const { candles, verified, source } = await getDayCandlesWithCache({ pairId, day, intervalMs });
    const root = merkleRoot(candles);
    const archive = await prisma.candleDayArchive.findUnique({ where: { day_pairId_intervalMs: { day, pairId, intervalMs } } });
    return Response.json({
      day,
      pairId,
      interval,
      intervalMs,
      seedHash: seedRow.seedHash,
      revealed: seedRow.revealed,
      seed: reveal ? reveal.seed : null,
      candles,
      merkleRoot: root,
      archived: archive ? { s3Key: archive.s3Key, merkleRoot: archive.merkleRoot, rowCount: archive.rowCount } : null,
      source,
      verified,
    });
  } catch (e) {
    return toJsonError(e);
  }
}
