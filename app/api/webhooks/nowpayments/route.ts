import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyIpnSignature, type NowIpn } from "@/lib/nowpayments";
import { settleGatewaySuccess, settleGatewayFailure } from "@/lib/services/gateway-settle";
import { logAudit } from "@/lib/services/audit";

export const dynamic = "force-dynamic";

// NOWPayments IPN handler. No auth — authenticity comes from the HMAC-SHA512
// x-nowpayments-sig header checked against our IPN secret.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let body: NowIpn;
  try {
    body = JSON.parse(rawBody) as NowIpn;
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  if (!verifyIpnSignature(body, request.headers.get("x-nowpayments-sig"))) {
    return Response.json({ error: "bad signature" }, { status: 401 });
  }

  const orderId = typeof body.order_id === "string" ? body.order_id : null;
  const paymentId = body.payment_id != null ? String(body.payment_id) : null;
  if (!orderId && !paymentId) {
    return Response.json({ error: "missing order reference" }, { status: 400 });
  }

  const deposit = await prisma.depositRequest.findFirst({
    where: {
      OR: [
        ...(orderId ? [{ gatewayRef: orderId } as const] : []),
        ...(paymentId ? [{ gatewayOrderId: paymentId } as const] : []),
      ],
    },
  });
  if (!deposit) {
    try {
      await logAudit(null, "deposit.ipn-unknown", "DepositRequest", orderId ?? paymentId ?? "?", { body });
    } catch {}
    return Response.json({ ok: true });
  }
  if (deposit.status !== "PENDING") {
    return Response.json({ ok: true });
  }

  const status = body.payment_status;
  if (status === "finished") {
    try {
      await settleGatewaySuccess(deposit.id, {
        txId: null,
        paidFiat: typeof body.price_amount === "number" ? body.price_amount : undefined,
        raw: rawBody,
        source: "webhook",
      });
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message.slice(0, 120) : "settle failed" },
        { status: 500 },
      );
    }
    return Response.json({ ok: true });
  }
  if (status === "failed" || status === "expired" || status === "refunded") {
    await settleGatewayFailure(
      deposit.id,
      status === "failed" ? "Payment failed at provider" : `Payment ${status} at provider`,
    );
    return Response.json({ ok: true });
  }
  // waiting / confirming / confirmed / sending / partially_paid — nothing to
  // do yet; acknowledge so the provider moves on.
  return Response.json({ ok: true });
}
