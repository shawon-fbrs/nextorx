import { requirePermission, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("user", "list");
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        uid: true,
        name: true,
        email: true,
        emailVerified: true,
        role: true,
        balance: true,
        bonusBalance: true,
        kycStatus: true,
        banned: true,
        banReason: true,
        banExpires: true,
        twoFactorEnabled: true,
        depositLimitDaily: true,
        referralCode: true,
        phone: true,
        country: true,
        createdAt: true,
        _count: { select: { ledgerEntries: true, deposits: true, withdrawals: true, trades: true } },
      },
    });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const [trades, sessions, kyc, exclusion] = await Promise.all([
      prisma.trade.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { pair: { select: { name: true } } },
      }),
      prisma.session.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, ipAddress: true, userAgent: true, createdAt: true, expiresAt: true },
      }),
      prisma.kycSubmission.findFirst({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        select: { id: true, tier: true, idType: true, status: true, createdAt: true },
      }),
      prisma.selfExclusion.findUnique({ where: { userId: id } }),
    ]);

    return Response.json({ user, trades, sessions, kyc, exclusion });
  } catch (e) {
    return toJsonError(e);
  }
}
