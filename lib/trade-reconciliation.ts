import { prisma } from "@/lib/db";
import { credit } from "@/lib/ledger";

export async function reconcileExpiredTrades(): Promise<number> {
  console.log("[Reconciliation] Checking for expired active trades...");

  const now = new Date();

  const activeTrades = await prisma.trade.findMany({
    where: { status: "ACTIVE" },
    include: { pair: true },
  });

  let settledCount = 0;

  for (const trade of activeTrades) {
    const tradeCreatedAt = new Date(trade.createdAt).getTime();
    const expiredAt = tradeCreatedAt + trade.durationSeconds * 1000;

    if (now.getTime() > expiredAt) {
      try {
        const lastCandle = await prisma.candle.findFirst({
          where: { pairId: trade.pairId },
          orderBy: { timestamp: "desc" },
        });
        const closePrice = lastCandle ? Number(lastCandle.close) : Number(trade.openPrice);
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
          await tx.trade.update({
            where: { id: trade.id },
            data: {
              closePrice,
              status: won ? "WON" : "LOST",
              profit,
              settledAt: now,
            },
          });
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

        if (won) {
          await credit({
            userId: trade.userId,
            type: "TRADE_WIN",
            amount: trade.amount + payout,
            referenceId: trade.id,
            description: `Trade won (reconciled): ${trade.pair.name} ${trade.direction}`,
          });
        }

        settledCount++;
        console.log(`[Reconciliation] Settled trade ${trade.id} - ${won ? "WON" : "LOST"}`);
      } catch (error) {
        console.error(`[Reconciliation] Failed to settle trade ${trade.id}:`, error);
      }
    }
  }

  if (settledCount > 0) {
    console.log(`[Reconciliation] Settled ${settledCount} expired trades`);
  } else {
    console.log("[Reconciliation] No expired trades found");
  }

  return settledCount;
}
