import { toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getPayoutBreakdown } from "@/lib/payout";

export async function GET() {
  try {
    const pairs = await prisma.pair.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    const entries = await Promise.all(
      pairs.map(async (p) => {
        const b = await getPayoutBreakdown(p.id);
        return [p.id, b] as const;
      }),
    );
    const map: Record<string, { payout: number; base: number; adjustments: { reason: string; delta: number }[] }> = {};
    for (const [id, b] of entries) map[id] = b;
    return Response.json({ payouts: map });
  } catch (e) {
    return toJsonError(e);
  }
}
