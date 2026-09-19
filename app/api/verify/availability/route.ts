import { toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const candleDates = await prisma.$queryRaw<{ day: string }[]>`
      SELECT DISTINCT to_char(to_timestamp("timestamp" / 1000), 'YYYY-MM-DD') AS day
      FROM "SecondCandle"
      WHERE "timestamp" > 0
      ORDER BY day DESC
    `;
    const allDates = candleDates.map((r) => r.day);

    const seeds = await prisma.serverSeed.findMany({
      where: { revealed: true },
      select: { day: true, pairId: true },
    });

    const revealedSet = new Set(seeds.map((s) => `${s.day}|${s.pairId}`));

    const today = new Date().toISOString().slice(0, 10);

    const dates = allDates.map((day) => {
      const pairIds = [...new Set(seeds.filter((s) => s.day === day).map((s) => s.pairId))];
      const hasRevealedSeed = pairIds.length > 0;
      return { day, hasRevealedSeed, revealedPairCount: pairIds.length };
    });

    const validDates = dates.filter((d) => d.hasRevealedSeed).map((d) => d.day);

    return Response.json({
      dates,
      validDates,
      earliestDate: allDates[allDates.length - 1] ?? today,
      latestDate: allDates[0] ?? today,
      today,
    });
  } catch (e) {
    return toJsonError(e);
  }
}
