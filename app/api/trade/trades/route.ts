import { NextRequest } from "next/server";
import { z } from "zod";
import { TradeDirection, TradeStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser, toJsonError } from "@/lib/api";
import { postEntryInTx } from "@/lib/ledger";

const MIN_DURATION_SECONDS = 30;
const MAX_DURATION_SECONDS = 3600;
const DUPLICATE_WINDOW_MS = 3000;

const tradeSchema = z.object({
  pairId: z.string().min(1),
  direction: z.enum(["UP", "DOWN"]),
  amount: z.number().positive().max(1000000),
  durationSeconds: z.number().int().min(MIN_DURATION_SECONDS).max(MAX_DURATION_SECONDS),
});

function isWeekendUTC(now = new Date()): boolean {
  const day = now.getUTCDay();
  return day === 0 || day === 6;
}

export function effectivePayoutForPair(pair: {
  payoutPercent: unknown;
  weekendPayout: unknown;
  maxPayout: unknown;
}): number {
  const base = Number(pair.payoutPercent);
  const weekend = pair.weekendPayout != null ? Number(pair.weekendPayout) : null;
  const max = pair.maxPayout != null ? Number(pair.maxPayout) : 95;
  const raw = isWeekendUTC() && weekend != null ? weekend : base;
  return Math.max(50, Math.min(max, raw));
}

async function getSnapshotPrice(pairId: string, fallbackBase: number): Promise<number> {
  try {
    const { getOTCEngine } = await import("@/lib/otc-engine");
    const engine = await getOTCEngine();
    const live = engine.getCurrentPrice(pairId);
    if (live != null && Number.isFinite(live) && live > 0) return live;
  } catch {}
  const lastCandle = await prisma.candle.findFirst({
    where: { pairId },
    orderBy: { timestamp: "desc" },
  });
  if (lastCandle) return Number(lastCandle.close);
  return fallbackBase;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 50);
    const status = request.nextUrl.searchParams.get("status");

    const trades = await prisma.trade.findMany({
      where: {
        userId: user.id,
        ...(status ? { status: status as TradeStatus } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 200),
      include: { pair: { select: { id: true, name: true, category: true } } },
    });

    return Response.json({ trades });
  } catch (e) {
    return toJsonError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = tradeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    const { pairId, direction, durationSeconds } = parsed.data;
    const amountCents = Math.round(parsed.data.amount * 100);

    const pair = await prisma.pair.findUnique({ where: { id: pairId } });
    if (!pair || !pair.isActive) {
      return Response.json({ error: "Pair not found or inactive" }, { status: 404 });
    }

    const minCents = Math.round(Number(pair.minTrade) * 100);
    const maxCents = Math.round(Number(pair.maxTrade) * 100);
    if (amountCents < minCents || amountCents > maxCents) {
      return Response.json(
        { error: `Amount must be between $${(minCents / 100).toFixed(2)} and $${(maxCents / 100).toFixed(2)}` },
        { status: 400 },
      );
    }

    const payoutPercent = effectivePayoutForPair(pair);

    const [profile, dayStart] = await Promise.all([
      prisma.userRiskProfile.findUnique({ where: { userId: user.id } }),
      Promise.resolve(new Date(new Date().setHours(0, 0, 0, 0))),
    ]);

    if (profile) {
      const todayAgg = await prisma.trade.aggregate({
        where: { userId: user.id, createdAt: { gte: dayStart } },
        _sum: { amount: true },
      });
      const todayVolume = todayAgg._sum.amount ?? 0;
      if (todayVolume + amountCents > profile.betLimitDaily) {
        return Response.json({ error: "Daily trading limit reached" }, { status: 400 });
      }
    }

    const duplicate = await prisma.trade.findFirst({
      where: {
        userId: user.id,
        pairId,
        direction,
        amount: amountCents,
        createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
      },
      select: { id: true },
    });
    if (duplicate) {
      return Response.json({ error: "Duplicate trade detected. Please wait." }, { status: 409 });
    }

    const openPrice = await getSnapshotPrice(pairId, Number(pair.basePrice));

    const trade = await prisma.$transaction(async (tx) => {
      const created = await tx.trade.create({
        data: {
          userId: user.id,
          pairId,
          direction: direction as TradeDirection,
          amount: amountCents,
          payoutPercent,
          durationSeconds,
          openPrice,
          status: "ACTIVE",
        },
      });
      await postEntryInTx(tx, {
        userId: user.id,
        type: "TRADE_HOLD",
        amount: amountCents,
        debit: true,
        referenceId: created.id,
        description: `Trade placed (${pair.name} ${direction} @ ${openPrice})`,
      });
      return created;
    });

    // TRACK-B B2: replace with BullMQ durable settle-trade job + settleAt column.
    setTimeout(() => void settleTrade(trade.id), durationSeconds * 1000);

    return Response.json({ trade });
  } catch (e) {
    return toJsonError(e);
  }
}

async function settleTrade(tradeId: string): Promise<void> {
  try {
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: { pair: true },
    });
    if (!trade || trade.status !== "ACTIVE") return;

    const closePrice = await getSnapshotPrice(trade.pairId, Number(trade.openPrice));
    const openPrice = Number(trade.openPrice);
    const priceMovedUp = closePrice > openPrice;
    const directionCorrect =
      (trade.direction === "UP" && priceMovedUp) ||
      (trade.direction === "DOWN" && !priceMovedUp);

    const profile = await prisma.userRiskProfile.findUnique({
      where: { userId: trade.userId },
    });
    const effectiveWinRate = profile ? Number(profile.effectiveWinRate) : 0.48;
    const allowWin = Math.random() < effectiveWinRate;
    const won = directionCorrect && allowWin;

    const payout = Math.round(trade.amount * (Number(trade.payoutPercent) / 100));
    const profit = won ? payout : -trade.amount;

    await prisma.$transaction(async (tx) => {
      await tx.trade.update({
        where: { id: trade.id },
        data: { closePrice, status: won ? "WON" : "LOST", profit, settledAt: new Date() },
      });
      if (won) {
        await postEntryInTx(tx, {
          userId: trade.userId,
          type: "TRADE_WIN",
          amount: trade.amount + payout,
          referenceId: trade.id,
          description: `Trade won: ${trade.pair.name} ${trade.direction}`,
        });
      }
      if (profile) {
        await tx.userRiskProfile.update({
          where: { userId: trade.userId },
          data: {
            totalTrades: { increment: 1 },
            ...(won ? { totalWins: { increment: 1 }, currentLossStreak: 0 } : { currentLossStreak: { increment: 1 } }),
          },
        });
      }
    });
  } catch (error) {
    console.error("Trade settlement error:", error);
  }
}
