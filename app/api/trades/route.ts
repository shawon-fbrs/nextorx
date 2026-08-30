import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, toJsonError } from "@/lib/api";
import { debit } from "@/lib/ledger";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 50);
    const status = request.nextUrl.searchParams.get("status");

    const trades = await prisma.trade.findMany({
      where: {
        userId: user.id,
        ...(status ? { status: status as any } : {}),
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
    const body = await request.json();
    const { pairId, direction, amount, durationSeconds } = body;

    if (!pairId || !direction || !amount || !durationSeconds) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["UP", "DOWN"].includes(direction)) {
      return Response.json({ error: "Invalid direction" }, { status: 400 });
    }

    const pair = await prisma.pair.findUnique({ where: { id: pairId } });
    if (!pair || !pair.isActive) {
      return Response.json({ error: "Pair not found or inactive" }, { status: 404 });
    }

    const amountCents = Math.round(amount * 100);
    if (amountCents < Number(pair.minTrade) || amountCents > Number(pair.maxTrade)) {
      return Response.json({ error: `Amount must be between $${Number(pair.minTrade) / 100} and $${Number(pair.maxTrade) / 100}` }, { status: 400 });
    }

    const profile = await prisma.userRiskProfile.findUnique({
      where: { userId: user.id },
    });

    const lastCandle = await prisma.candle.findFirst({
      where: { pairId },
      orderBy: { timestamp: "desc" },
    });

    const openPrice = lastCandle ? Number(lastCandle.close) : Number(pair.basePrice);

    const trade = await prisma.trade.create({
      data: {
        userId: user.id,
        pairId,
        direction,
        amount: amountCents,
        payoutPercent: pair.payoutPercent,
        durationSeconds,
        openPrice,
        status: "ACTIVE",
      },
    });

    await debit({
      userId: user.id,
      type: "TRADE_HOLD",
      amount: amountCents,
      referenceId: trade.id,
      description: `Trade placed (${pair.name} ${direction})`,
    });

    setTimeout(async () => {
      try {
        const currentPrice = openPrice * (1 + (Math.random() - 0.5) * Number(pair.volatility) * 2);
        const shouldWin =
          (direction === "UP" && currentPrice > openPrice) ||
          (direction === "DOWN" && currentPrice < openPrice);

        const effectiveWinRate = profile ? Number(profile.effectiveWinRate) : 0.48;
        const randomWin = Math.random() < effectiveWinRate;
        const finalWin = shouldWin === randomWin ? shouldWin : randomWin;

        const profit = finalWin
          ? Math.round(amountCents * (Number(pair.payoutPercent) / 100))
          : -amountCents;

        await prisma.trade.update({
          where: { id: trade.id },
          data: {
            closePrice: currentPrice,
            status: finalWin ? "WON" : "LOST",
            profit,
            settledAt: new Date(),
          },
        });

        if (profile) {
          await prisma.userRiskProfile.update({
            where: { userId: user.id },
            data: {
              totalTrades: { increment: 1 },
              totalWins: finalWin ? { increment: 1 } : undefined,
              currentLossStreak: finalWin ? 0 : { increment: 1 },
            },
          });
        }
      } catch (error) {
        console.error("Trade settlement error:", error);
      }
    }, durationSeconds * 1000);

    return Response.json({ trade });
  } catch (e) {
    return toJsonError(e);
  }
}
