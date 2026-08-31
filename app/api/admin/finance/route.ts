import { requirePermission, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requirePermission("deposit", "list");

    const [deposits, withdrawals] = await Promise.all([
      prisma.depositRequest.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.withdrawalRequest.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    const txns = [
      ...deposits.map((d) => ({
        id: d.id,
        type: "deposit" as const,
        userId: d.userId,
        userName: d.user.name,
        userEmail: d.user.email,
        amount: d.amount,
        method: d.method,
        network: d.network,
        txHash: d.txHash,
        status: d.status.toLowerCase(),
        createdAt: d.createdAt.toISOString(),
        reviewedAt: d.reviewedAt?.toISOString() ?? null,
      })),
      ...withdrawals.map((w) => ({
        id: w.id,
        type: "withdrawal" as const,
        userId: w.userId,
        userName: w.user.name,
        userEmail: w.user.email,
        amount: w.amount,
        method: w.method,
        network: w.network,
        txHash: w.walletAddress,
        status: w.status.toLowerCase(),
        createdAt: w.createdAt.toISOString(),
        reviewedAt: w.reviewedAt?.toISOString() ?? null,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const stats = {
      pendingDeposits: deposits.filter((d) => d.status === "PENDING").length,
      pendingWithdrawals: withdrawals.filter((w) => w.status === "PENDING").length,
      totalDeposits: deposits.filter((d) => d.status === "VERIFIED").reduce((s, d) => s + d.amount, 0),
      totalWithdrawals: withdrawals.filter((w) => w.status === "APPROVED" || w.status === "PAID").reduce((s, w) => s + w.amount, 0),
    };

    return Response.json({ txns, stats });
  } catch (e) {
    return toJsonError(e);
  }
}
