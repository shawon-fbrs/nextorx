import { requireUser, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";

const BONUS_TYPES = [
  "BONUS_CREDIT",
  "BONUS_CONVERT",
  "BONUS_EXPIRE",
  "PROMO_CREDIT",
  "PROMO_CONVERT",
] as const;

export async function GET() {
  try {
    const user = await requireUser();
    const [profile, entries] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          bonusBalance: true,
          bonusTurnoverRequired: true,
          bonusTurnoverDone: true,
          bonusExpiresAt: true,
        },
      }),
      prisma.ledgerEntry.findMany({
        where: { userId: user.id, type: { in: [...BONUS_TYPES] } },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true, type: true, amount: true, bonusBalanceAfter: true,
          referenceId: true, description: true, createdAt: true,
        },
      }),
    ]);
    const required = profile?.bonusTurnoverRequired ?? 0;
    const done = profile?.bonusTurnoverDone ?? 0;
    return Response.json({
      bonusBalance: profile?.bonusBalance ?? 0,
      turnoverRequired: required,
      turnoverDone: done,
      turnoverProgress: required > 0 ? Math.min(100, Math.round((done / required) * 100)) : 0,
      bonusExpiresAt: profile?.bonusExpiresAt ?? null,
      history: entries,
    });
  } catch (e) {
    return toJsonError(e);
  }
}
