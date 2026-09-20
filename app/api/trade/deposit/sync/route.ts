import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { queryOrderByOuterSn, isRedotPayConfigured } from "@/lib/redotpay";
import { settleGatewaySuccess, settleGatewayFailure } from "@/lib/services/gateway-settle";

const schema = z.object({ id: z.string().min(1) });

// Manual reconciliation: user paid but the webhook never arrived (or is
// delayed). Queries RedotPay for the authoritative order status and settles
// through the same path as the webhook. Safe to call repeatedly.
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    if (!isRedotPayConfigured()) {
      return Response.json({ error: "Checkout is not available right now" }, { status: 503 });
    }
    const deposit = await prisma.depositRequest.findFirst({
      where: { id: parsed.data.id, userId: user.id },
    });
    if (!deposit || !deposit.gatewayRef) {
      return Response.json({ error: "Deposit not found" }, { status: 404 });
    }
    if (deposit.status === "VERIFIED") {
      return Response.json({ status: "VERIFIED" });
    }
    if (deposit.status !== "PENDING") {
      return Response.json({ status: deposit.status });
    }

    const remote = await queryOrderByOuterSn(deposit.gatewayRef);
    if (!remote) {
      return Response.json({ error: "Could not reach payment provider, try again" }, { status: 502 });
    }
    const orderStatus = Number((remote as { orderStatus?: unknown }).orderStatus);
    if (orderStatus === 2) {
      const r = remote as { txId?: unknown; orderAmount?: unknown };
      await settleGatewaySuccess(deposit.id, {
        txId: typeof r.txId === "string" ? r.txId : null,
        paidFiat: typeof r.orderAmount === "number" ? r.orderAmount : undefined,
        raw: JSON.stringify(remote).slice(0, 8000),
        source: "sync",
      });
      return Response.json({ status: "VERIFIED" });
    }
    if (orderStatus === 3 || orderStatus === 4) {
      await settleGatewayFailure(
        deposit.id,
        orderStatus === 3 ? "Payment failed at provider" : "Payment expired/closed at provider",
      );
      const updated = await prisma.depositRequest.findUnique({
        where: { id: deposit.id },
        select: { status: true, note: true },
      });
      return Response.json({ status: updated?.status ?? "REJECTED", note: updated?.note ?? null });
    }
    return Response.json({ status: "PENDING" });
  } catch (e) {
    return toJsonError(e);
  }
}
