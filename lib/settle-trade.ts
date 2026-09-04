import { prisma } from "@/lib/db";
import { postEntryInTx } from "@/lib/ledger";

export async function getSnapshotPrice(pairId: string, fallbackBase: number): Promise<number> {
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

export async function settleTradeById(tradeId: string): Promise<boolean> {
  try {
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: { pair: true },
    });
    if (!trade || trade.status !== "ACTIVE") return false;

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
    const won = directionCorrect && Math.random() < effectiveWinRate;

    const payout = Math.round(trade.amount * (Number(trade.payoutPercent) / 100));
    const profit = won ? payout : -trade.amount;

    await prisma.$transaction(async (tx) => {
      const updated = await tx.trade.updateMany({
        where: { id: trade.id, status: "ACTIVE" },
        data: { closePrice, status: won ? "WON" : "LOST", profit, settledAt: new Date() },
      });
      if (updated.count === 0) return;
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
            ...(won
              ? { totalWins: { increment: 1 }, currentLossStreak: 0 }
              : { currentLossStreak: { increment: 1 } }),
          },
        });
      }
    });

    return true;
  } catch (error) {
    console.error("Trade settlement error:", error);
    return false;
  }
}
