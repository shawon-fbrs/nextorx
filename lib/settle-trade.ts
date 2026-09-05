import { prisma } from "@/lib/db";
import { postEntryInTx } from "@/lib/ledger";

export async function getSnapshotPrice(pairId: string, fallbackBase: number): Promise<number> {  try {
    const { getOTCEngine } = await import("@/lib/otc-engine");
    const engine = await getOTCEngine();
    const committed = await engine.getLastCommittedSecondClose(pairId);
    if (committed != null && Number.isFinite(committed) && committed > 0) return committed;
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

    // Spread-based edge: entry already includes half-spread against the trader,
    // so a pure price comparison is the full settlement rule. No hidden dice.
    const won = directionCorrect;

    const profile = await prisma.userRiskProfile.findUnique({
      where: { userId: trade.userId },
    });

    const payout = Math.round(trade.amount * (Number(trade.payoutPercent) / 100));
    const profit = won ? payout : -trade.amount;
    const wallet = (trade.wallet as "real" | "demo") ?? "real";
    const isDemo = wallet === "demo";

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
          wallet,
          referenceId: trade.id,
          description: `Trade won: ${trade.pair.name} ${trade.direction}`,
        });
      }
      if (profile && !isDemo) {
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
      const bonusUser = await tx.user.findUnique({
        where: { id: trade.userId },
        select: { bonusBalance: true, bonusTurnoverRequired: true, bonusTurnoverDone: true },
      });
      if (!isDemo && bonusUser && bonusUser.bonusTurnoverRequired > 0) {
        const done = bonusUser.bonusTurnoverDone + trade.amount;
        if (done >= bonusUser.bonusTurnoverRequired && bonusUser.bonusBalance > 0) {
          const convertible = bonusUser.bonusBalance;
          await postEntryInTx(tx, {
            userId: trade.userId,
            type: "BONUS_CONVERT",
            amount: convertible,
            referenceId: `bonus-convert:${trade.userId}:${trade.id}`,
            description: "Bonus wagering complete — converted to real balance",
          });
          await postEntryInTx(tx, {
            userId: trade.userId,
            type: "BONUS_CONVERT",
            amount: 0,
            bonusAmount: -convertible,
            referenceId: `bonus-convert-b:${trade.userId}:${trade.id}`,
            description: "Bonus wagering complete — bonus cleared",
          });
          await tx.user.update({
            where: { id: trade.userId },
            data: { bonusTurnoverRequired: 0, bonusTurnoverDone: 0, bonusExpiresAt: null },
          });
        } else {
          await tx.user.update({
            where: { id: trade.userId },
            data: { bonusTurnoverDone: done },
          });
        }
      }
    });

    return true;
  } catch (error) {
    console.error("Trade settlement error:", error);
    return false;
  }
}
