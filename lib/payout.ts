import { prisma } from "@/lib/db";

const PEAK_HOURS_UTC = new Set([8, 9, 10, 14, 15, 16, 17, 20, 21]);
const PEAK_ADJUSTMENT = -2;
const VOLUME_HIGH_ADJUSTMENT = -3;
const VOLUME_ELEVATED_ADJUSTMENT = -1;
const VAULT_CRITICAL_ADJUSTMENT = -5;
const VAULT_WARNING_ADJUSTMENT = -2;
const MAX_COMBINED_REDUCTION = 10;
const MIN_PAYOUT = 50;

export interface PayoutAdjustment {
  reason: string;
  delta: number;
}

export interface PayoutBreakdown {
  payout: number;
  base: number;
  adjustments: PayoutAdjustment[];
}

async function getVaultReservePercent(): Promise<number> {
  const [balanceAgg, exposureAgg, pendingAgg] = await Promise.all([
    prisma.user.aggregate({ _sum: { balance: true } }),
    prisma.trade.aggregate({ where: { status: "ACTIVE" }, _sum: { amount: true } }),
    prisma.withdrawalRequest.aggregate({ where: { status: "PENDING" }, _sum: { amount: true } }),
  ]);
  const total = Number(balanceAgg._sum.balance ?? 0);
  if (total <= 0) return 100;
  const committed =
    Number(exposureAgg._sum.amount ?? 0) + Number(pendingAgg._sum.amount ?? 0);
  return ((total - committed) / total) * 100;
}

export async function getPayoutBreakdown(pairId: string, now = new Date()): Promise<PayoutBreakdown> {
  const pair = await prisma.pair.findUnique({ where: { id: pairId } });
  if (!pair) return { payout: 0, base: 0, adjustments: [] };

  const day = now.getUTCDay();
  const isWeekend = day === 0 || day === 6;
  const base =
    isWeekend && pair.weekendPayout != null
      ? Number(pair.weekendPayout)
      : Number(pair.payoutPercent);
  const max = pair.maxPayout != null ? Number(pair.maxPayout) : 95;
  const adjustments: PayoutAdjustment[] = [];

  if (PEAK_HOURS_UTC.has(now.getUTCHours())) {
    adjustments.push({ reason: "peak-hours", delta: PEAK_ADJUSTMENT });
  }

  if (pair.maxDailyVolume != null && pair.maxDailyVolume > 0) {
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);
    const vol = await prisma.trade.aggregate({
      where: { pairId, createdAt: { gte: dayStart } },
      _sum: { amount: true },
    });
    const ratio = Number(vol._sum.amount ?? 0) / pair.maxDailyVolume;
    if (ratio > 0.8) {
      adjustments.push({ reason: "high-volume", delta: VOLUME_HIGH_ADJUSTMENT });
    } else if (ratio > 0.5) {
      adjustments.push({ reason: "elevated-volume", delta: VOLUME_ELEVATED_ADJUSTMENT });
    }
  }

  const reservePercent = await getVaultReservePercent();
  if (reservePercent < 20) {
    adjustments.push({ reason: "vault-critical", delta: VAULT_CRITICAL_ADJUSTMENT });
  } else if (reservePercent < 30) {
    adjustments.push({ reason: "vault-warning", delta: VAULT_WARNING_ADJUSTMENT });
  }

  let reduction = adjustments.reduce((sum, a) => sum + a.delta, 0);
  if (reduction < -MAX_COMBINED_REDUCTION) reduction = -MAX_COMBINED_REDUCTION;

  const payout = Math.max(MIN_PAYOUT, Math.min(max, base + reduction));

  if (adjustments.length > 0) {
    console.log(
      JSON.stringify({
        event: "payout.adjusted",
        pairId,
        base,
        payout,
        adjustments,
        reservePercent: Math.round(reservePercent * 100) / 100,
      }),
    );
  }

  return { payout, base, adjustments };
}

export async function getPayoutForPair(pairId: string, now = new Date()): Promise<number> {
  return (await getPayoutBreakdown(pairId, now)).payout;
}
