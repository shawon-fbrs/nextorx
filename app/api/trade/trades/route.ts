import { NextRequest } from "next/server";
import { z } from "zod";
import { TradeDirection, TradeStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser, toJsonError, parseListQuery } from "@/lib/api";
import { postEntryInTx } from "@/lib/ledger";
import { getSnapshotPrice } from "@/lib/settle-trade";
import { getPayoutForPair } from "@/lib/payout";
import { getSetting } from "@/lib/settings";

const MIN_DURATION_SECONDS = 30;
const MAX_DURATION_SECONDS = 3600;
const DUPLICATE_WINDOW_MS = 3000;

const tradeSchema = z.object({
  pairId: z.string().min(1),
  direction: z.enum(["UP", "DOWN"]),
  amount: z.number().positive().max(1000000),
  durationSeconds: z.number().int().min(MIN_DURATION_SECONDS).max(MAX_DURATION_SECONDS),
  wallet: z.enum(["real", "demo"]).default("real"),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { status, limit } = parseListQuery(request.nextUrl, ["PENDING", "ACTIVE", "WON", "LOST", "CANCELLED"]);
    const walletParam = request.nextUrl.searchParams.get("wallet");
    const wallet = walletParam === "demo" ? "demo" : walletParam === "real" ? "real" : undefined;

    const trades = await prisma.trade.findMany({
      where: {
        userId: user.id,
        ...(status ? { status: status as TradeStatus } : {}),
        ...(wallet ? { wallet } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
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
    const { pairId, direction, durationSeconds, wallet } = parsed.data;
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

    const payoutPercent = await getPayoutForPair(pairId);
    const isDemo = wallet === "demo";

    const trader = await prisma.user.findUnique({
      where: { id: user.id },
      select: { bonusBalance: true },
    });
    if (!isDemo && (trader?.bonusBalance ?? 0) > 0) {
      const maxBonusBet = await getSetting("maxBonusBet");
      if (amountCents > maxBonusBet) {
        return Response.json(
          { error: `Max stake while bonus is active is $${(maxBonusBet / 100).toFixed(2)}` },
          { status: 400 },
        );
      }
    }

    const profile = await prisma.userRiskProfile.findUnique({ where: { userId: user.id } });

    if (!isDemo && profile) {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const todayAgg = await prisma.trade.aggregate({
        where: { userId: user.id, wallet: "real", createdAt: { gte: dayStart } },
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
        wallet,
        createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
      },
      select: { id: true },
    });
    if (duplicate) {
      return Response.json({ error: "Duplicate trade detected. Please wait." }, { status: 409 });
    }

    const marketPrice = await getSnapshotPrice(pairId, Number(pair.basePrice));
    const halfSpread = Number(pair.spread) / 2;
    const rawEntry = direction === "UP" ? marketPrice + halfSpread : marketPrice - halfSpread;
    const openPrice = Math.max(0.00000001, Math.round(rawEntry * 1e8) / 1e8);

    const trade = await prisma.$transaction(async (tx) => {
      const created = await tx.trade.create({
        data: {
          userId: user.id,
          pairId,
          direction: direction as TradeDirection,
          amount: amountCents,
          wallet,
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
        wallet,
        referenceId: created.id,
        description: `Trade placed (${pair.name} ${direction} @ ${openPrice}, spread ${pair.spread})`,
      });
      return created;
    });

    // Settlement is handled by the polling worker in server.ts (requires
    // custom server: dev:ws / start:prod) plus startup reconciliation.
    // TRACK-B B2: replace with BullMQ durable settle-trade job + settleAt column.

    return Response.json({ trade });
  } catch (e) {
    return toJsonError(e);
  }
}
