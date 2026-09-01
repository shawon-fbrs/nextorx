import { prisma } from "@/lib/db";
import { credit } from "@/lib/ledger";

/**
 * Settle any expired trades that were not settled (e.g., after server restart)
 * This runs on startup to ensure no trades are left in ACTIVE state
 */
export async function reconcileExpiredTrades(): Promise<number> {
  console.log("[Reconciliation] Checking for expired active trades...");

  const now = new Date();

  // Find all active trades
  const activeTrades = await prisma.trade.findMany({
    where: { status: "ACTIVE" },
    include: { pair: true },
  });

  let settledCount = 0;

  for (const trade of activeTrades) {
    // Calculate when this trade should have expired
    const tradeCreatedAt = new Date(trade.createdAt).getTime();
    const durationMs = trade.durationSeconds * 1000;
    const expiredAt = tradeCreatedAt + durationMs;

    // Check if trade has expired
    if (now.getTime() > expiredAt) {
      try {
        // Use the open price as close price for reconciliation
        // This is a fallback - in production, you'd want to use the actual price at expiry
        const closePrice = Number(trade.openPrice);

        // Determine outcome based on win rate (simplified for reconciliation)
        const effectiveWinRate = 0.48; // Default win rate
        const won = Math.random() < effectiveWinRate;

        const payout = Math.round(trade.amount * (Number(trade.payoutPercent) / 100));
        const profit = won ? payout : -trade.amount;

        // Update trade record
        await prisma.trade.update({
          where: { id: trade.id },
          data: {
            closePrice,
            status: won ? "WON" : "LOST",
            profit,
            settledAt: now,
          },
        });

        // Credit user on win
        if (won) {
          await credit({
            userId: trade.userId,
            type: "TRADE_WIN",
            amount: trade.amount + payout,
            referenceId: trade.id,
            description: `Trade won (reconciled): ${trade.pair.name} ${trade.direction}`,
          });
        }

        // Update risk profile
        await prisma.userRiskProfile.upsert({
          where: { userId: trade.userId },
          create: {
            userId: trade.userId,
            totalTrades: 1,
            totalWins: won ? 1 : 0,
            currentLossStreak: won ? 0 : 1,
          },
          update: {
            totalTrades: { increment: 1 },
            totalWins: won ? { increment: 1 } : undefined,
            currentLossStreak: won ? 0 : { increment: 1 },
          },
        });

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
