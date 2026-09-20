import { prisma } from "@/lib/db";
import { verifyDeposit, rejectDeposit, DepositError } from "@/lib/services/deposits";
import { logAudit } from "@/lib/services/audit";

// Shared settlement for RedotPay Connect gateway deposits. Used by BOTH the
// webhook handler and the manual sync endpoint so the two paths can never
// diverge (double-credit, missed promo, missing audit).

async function systemReviewerId(userIdFallback: string): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { role: { in: ["super_admin", "finance"] } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return admin?.id ?? userIdFallback;
}

export async function settleGatewaySuccess(
  depositId: string,
  opts: { txId?: string | null; paidFiat?: number; raw?: string; source: "webhook" | "sync" },
): Promise<{ credited: boolean }> {
  const deposit = await prisma.depositRequest.findUnique({ where: { id: depositId } });
  if (!deposit) throw new DepositError("Deposit not found");
  // Idempotent: retries / double syncs must not double-credit.
  if (deposit.status === "VERIFIED") return { credited: false };
  if (deposit.status !== "PENDING") return { credited: false };

  if (opts.paidFiat != null && Number.isFinite(opts.paidFiat)) {
    if (Math.abs(opts.paidFiat - deposit.amount / 100) > 0.01) {
      const reviewer = await systemReviewerId(deposit.userId);
      await rejectDeposit(deposit.id, reviewer, "Amount mismatch at provider").catch(() => {});
      try {
        await logAudit(null, "deposit.gateway-amount-mismatch", "DepositRequest", deposit.id, {
          source: opts.source,
          paidFiat: opts.paidFiat,
        });
      } catch {}
      throw new DepositError("Amount mismatch at provider");
    }
  }

  await prisma.depositRequest.update({
    where: { id: deposit.id },
    data: {
      txHash: opts.txId ? opts.txId : deposit.txHash,
      gatewayRaw: opts.raw ? opts.raw.slice(0, 8000) : deposit.gatewayRaw,
    },
  });
  const reviewer = await systemReviewerId(deposit.userId);
  await verifyDeposit(deposit.id, reviewer);
  try {
    await logAudit(null, "deposit.gateway-verified", "DepositRequest", deposit.id, {
      source: opts.source,
      txId: opts.txId ?? null,
    });
  } catch {}
  return { credited: true };
}

export async function settleGatewayFailure(depositId: string, reason: string): Promise<{ handled: boolean }> {
  const deposit = await prisma.depositRequest.findUnique({ where: { id: depositId } });
  if (!deposit || deposit.status !== "PENDING") return { handled: false };
  const reviewer = await systemReviewerId(deposit.userId);
  await rejectDeposit(deposit.id, reviewer, reason).catch(() => {});
  try {
    await logAudit(null, "deposit.gateway-failed", "DepositRequest", deposit.id, { reason });
  } catch {}
  return { handled: true };
}
