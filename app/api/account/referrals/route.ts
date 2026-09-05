import { requireUser, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireUser();
    const [me, referrals] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: { referralCode: true },
      }),
      prisma.referral.findMany({
        where: { referrerId: user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, referredId: true, bonusPaid: true, createdAt: true },
      }),
    ]);
    const referredUsers = referrals.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: referrals.map((r) => r.referredId) } },
          select: { id: true, name: true, nickname: true, createdAt: true },
        })
      : [];
    const userMap = new Map(referredUsers.map((u) => [u.id, u]));
    return Response.json({
      referralCode: me?.referralCode ?? null,
      totalEarned: referrals.reduce((sum, r) => sum + r.bonusPaid, 0),
      referrals: referrals.map((r) => ({
        id: r.id,
        bonusPaid: r.bonusPaid,
        createdAt: r.createdAt,
        user: userMap.get(r.referredId) ?? null,
      })),
    });
  } catch (e) {
    return toJsonError(e);
  }
}
