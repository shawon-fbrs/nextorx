import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser, toJsonError } from "@/lib/api";
import { env } from "@/env";
import { prisma } from "@/lib/db";
import {
  createGatewayDepositRequest,
  DepositError,
  GATEWAY_METHOD,
  NOWPAYMENTS_METHOD,
} from "@/lib/services/deposits";
import {
  buildOuterOrderSn,
  createPaymentOrder,
  isRedotPayConfigured,
  RedotPayError,
} from "@/lib/redotpay";
import { createInvoice, isNowPaymentsConfigured, NowPaymentsError } from "@/lib/nowpayments";

const schema = z.object({
  amount: z.number().int().min(100),
  promoCode: z.string().optional(),
  provider: z.enum(["redotpay", "nowpayments"]).default("redotpay"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    if (parsed.data.provider === "nowpayments") {
      return createNowPaymentsOrder(user.id, parsed.data.amount, parsed.data.promoCode);
    }
    return createRedotPayOrder(user.id, parsed.data.amount, parsed.data.promoCode);
  } catch (e) {
    return toJsonError(e);
  }
}

async function createRedotPayOrder(userId: string, amountCents: number, promoCode?: string) {
  if (!isRedotPayConfigured()) {
    return Response.json({ error: "RedotPay checkout is not available right now" }, { status: 503 });
  }
  const gatewayRef = buildOuterOrderSn();
  const deposit = await createGatewayDepositRequest(userId, amountCents, gatewayRef, GATEWAY_METHOD, "USDT", promoCode);

  const orderAmount = amountCents / 100;
  let redirectUrl: string;
  try {
    const order = await createPaymentOrder({
      outerOrderSn: gatewayRef,
      outerUid: userId.slice(0, 32),
      orderAmount,
      orderCurrency: "USD",
      orderDesc: `NextOrx deposit $${orderAmount.toFixed(2)}`,
      redirectUrl: `${env.BETTER_AUTH_URL}/deposit?status=return&order=${deposit.id}`,
      timeExpire: Date.now() + 30 * 60 * 1000,
    });
    await prisma.depositRequest.update({
      where: { id: deposit.id },
      data: { gatewayOrderId: order.orderSn },
    });
    redirectUrl = order.webUrl ?? order.h5Url ?? order.appUrl ?? "";
    if (!redirectUrl) throw new RedotPayError("No payment URL returned");
  } catch (e) {
    await prisma.depositRequest.delete({ where: { id: deposit.id } }).catch(() => {});
    const msg = e instanceof DepositError || e instanceof RedotPayError
      ? e.message
      : "Payment provider unavailable, please try again";
    return Response.json({ error: msg, method: GATEWAY_METHOD }, { status: 502 });
  }

  return Response.json(
    { depositId: deposit.id, orderRef: gatewayRef, redirectUrl, method: GATEWAY_METHOD },
    { status: 201 },
  );
}

async function createNowPaymentsOrder(userId: string, amountCents: number, promoCode?: string) {
  if (!isNowPaymentsConfigured()) {
    return Response.json({ error: "NOWPayments checkout is not available right now" }, { status: 503 });
  }
  const gatewayRef = `NP-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "X")}`;
  const deposit = await createGatewayDepositRequest(
    userId,
    amountCents,
    gatewayRef,
    NOWPAYMENTS_METHOD,
    "TRC20",
    promoCode,
  );

  const orderAmount = amountCents / 100;
  try {
    const invoice = await createInvoice({
      orderId: gatewayRef,
      amountUsd: orderAmount,
      description: `NextOrx deposit $${orderAmount.toFixed(2)}`,
      ipnCallbackUrl: `${env.BETTER_AUTH_URL}/api/webhooks/nowpayments`,
      successUrl: `${env.BETTER_AUTH_URL}/deposit?status=return&order=${deposit.id}`,
      cancelUrl: `${env.BETTER_AUTH_URL}/deposit`,
    });
    await prisma.depositRequest.update({
      where: { id: deposit.id },
      data: { gatewayOrderId: String(invoice.id) },
    });
    return Response.json(
      { depositId: deposit.id, orderRef: gatewayRef, redirectUrl: invoice.invoice_url, method: NOWPAYMENTS_METHOD },
      { status: 201 },
    );
  } catch (e) {
    await prisma.depositRequest.delete({ where: { id: deposit.id } }).catch(() => {});
    const msg = e instanceof DepositError || e instanceof NowPaymentsError
      ? e.message
      : "Payment provider unavailable, please try again";
    return Response.json({ error: msg, method: NOWPAYMENTS_METHOD }, { status: 502 });
  }
}
