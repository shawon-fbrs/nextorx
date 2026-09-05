import { prisma } from "@/lib/db";
import { settleTradeById } from "@/lib/settle-trade";

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
        const ok = await settleTradeById(trade.id);
        if (ok) {
          settledCount++;
          console.log(`[Reconciliation] Settled trade ${trade.id}`);
        }
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
