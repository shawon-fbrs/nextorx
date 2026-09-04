import { NextRequest } from "next/server";
import { z } from "zod";
import { TradeDirection, TradeStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser, toJsonError } from "@/lib/api";
import { postEntryInTx } from "@/lib/ledger";
import { getSnapshotPrice } from "@/lib/settle-trade";
import { getPayoutForPair } from "@/lib/payout";

const MIN_DURATION_SECONDS = 30;
const MAX_DURATION_SECONDS = 3600;
const DUPLICATE_WINDOW_MS = 3000;

const tradeSchema = z.object({
  pairId: z.string().min(1),
  direction: z.enum(["UP", "DOWN"]),
  amount: z.number().positive().max(1000000),
  durationSeconds: z.number().int().min(MIN_DURATION_SECONDS).max(MAX_DURATION_SECONDS),
});

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

    const payoutPercent = await getPayoutForPair(pairId);

    const profile = await prisma.userRiskProfile.findUnique({ where: { userId: user.id } });

    if (profile) {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
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

    // Settlement is handled by the polling worker in server.ts (requires
    // custom server: dev:ws / start:prod) plus startup reconciliation.
    // TRACK-B B2: replace with BullMQ durable settle-trade job + settleAt column.

    return Response.json({ trade });
  } catch (e) {
    return toJsonError(e);
  }
}
