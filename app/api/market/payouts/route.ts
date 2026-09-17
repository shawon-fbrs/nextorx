import { toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getPayoutBreakdown } from "@/lib/payout";
import { withCache } from "@/lib/redis";

export async function GET() {
  try {
    const map = await withCache("market:payouts", 60, async () => {
      const pairs = await prisma.pair.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      const entries = await Promise.all(
        pairs.map(async (p) => {
          const b = await getPayoutBreakdown(p.id);
          return [p.id, b.payout] as const;
        }),
      );
      const result: Record<string, number> = {};
      for (const [id, payout] of entries) result[id] = payout;
      return result;
    });
    return Response.json({ payouts: map });
  } catch (e) {
    return toJsonError(e);
  }
}
