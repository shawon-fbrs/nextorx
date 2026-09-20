import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyDeposit, rejectDeposit } from "@/lib/services/deposits";
import { verifyWebhookSignature, type RedotPayWebhook } from "@/lib/redotpay";
import { logAudit } from "@/lib/services/audit";

export const dynamic = "force-dynamic";

function redotPayResponse(code: "SUCCESS" | "FAIL", requestId: string, msg?: string) {
  // RedotPay's expected shape ( NOT our standard { error } shape ).
  // Non-SUCCESS triggers their retry policy (180s x 3).
  return Response.json(msg ? { code, requestId, msg } : { code, requestId });
}

async function systemReviewerId(): Promise<string | null> {
  const admin = await prisma.user.findFirst({
    where: { role: { in: ["super_admin", "finance"] } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return admin?.id ?? null;
}

export async function POST(request: NextRequest) {
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  // Raw bytes — re-serializing JSON would change spacing and break the RSA check.
  const rawBody = await request.text();
  const okSig = verifyWebhookSignature(
    rawBody,
    request.headers.get("X-R-Signature"),
    request.headers.get("X-R-Ts"),
    request.headers.get("X-R-Key-Version"),
  );
  if (!okSig) {
    return redotPayResponse("FAIL", requestId, "bad signature");
  }

  let body: RedotPayWebhook;
  try {
    body = JSON.parse(rawBody) as RedotPayWebhook;
  } catch {
    return redotPayResponse("FAIL", requestId, "bad json");
  }

  const orderSn = body.orderSn ?? body.preSn ?? null;
  const outerSn = body.outerOrderSn ?? body.outerOrder ?? null;
  if (!orderSn && !outerSn) {
    return redotPayResponse("FAIL", requestId, "missing order reference");
  }

  const deposit = await prisma.depositRequest.findFirst({
    where: {
      OR: [
        ...(orderSn ? [{ gatewayOrderId: orderSn } as const] : []),
        ...(outerSn ? [{ gatewayRef: outerSn } as const] : []),
      ],
    },
  });
  if (!deposit) {
    // Unknown order — acknowledge so RedotPay stops retrying; log for review.
    try {
      await logAudit(null, "deposit.webhook-unknown", "DepositRequest", outerSn ?? orderSn ?? "?", { body });
    } catch {}
    return redotPayResponse("SUCCESS", requestId);
  }

  // Idempotent: retries after success must not double-credit.
  if (deposit.status === "VERIFIED") {
    return redotPayResponse("SUCCESS", requestId);
  }
  if (deposit.status !== "PENDING") {
    return redotPayResponse("SUCCESS", requestId);
  }

  const status = body.orderStatus;
  if (status !== 2) {
    if (status === 3 || status === 4) {
      const reviewer = (await systemReviewerId()) ?? deposit.userId;
      await rejectDeposit(
        deposit.id,
        reviewer,
        status === 3 ? "Payment failed at provider" : "Payment expired/closed at provider",
      ).catch(() => {});
      try {
        await logAudit(null, "deposit.webhook-failed", "DepositRequest", deposit.id, { body });
      } catch {}
    }
    return redotPayResponse("SUCCESS", requestId);
  }

  // Amount sanity: fiat amount echoes what WE sent at order creation.
  const paidFiat = Number(body.orderAmount ?? NaN);
  if (Number.isFinite(paidFiat) && Math.abs(paidFiat - deposit.amount / 100) > 0.01) {
    const reviewer = (await systemReviewerId()) ?? deposit.userId;
    await rejectDeposit(deposit.id, reviewer, "Amount mismatch at provider").catch(() => {});
    try {
      await logAudit(null, "deposit.webhook-amount-mismatch", "DepositRequest", deposit.id, { body });
    } catch {}
    return redotPayResponse("SUCCESS", requestId);
  }

  try {
    await prisma.depositRequest.update({
      where: { id: deposit.id },
      data: {
        txHash: typeof body.txId === "string" && body.txId ? body.txId : deposit.txHash,
        gatewayRaw: rawBody.slice(0, 8000),
      },
    });
    const reviewer = (await systemReviewerId()) ?? deposit.userId;
    await verifyDeposit(deposit.id, reviewer);
    try {
      await logAudit(null, "deposit.webhook-verified", "DepositRequest", deposit.id, {
        orderSn,
        txId: body.txId,
        cryptoAmount: body.cryptoAmount,
      });
    } catch {}
    return redotPayResponse("SUCCESS", requestId);
  } catch (e) {
    return redotPayResponse("FAIL", requestId, e instanceof Error ? e.message.slice(0, 120) : "verify failed");
  }
}
