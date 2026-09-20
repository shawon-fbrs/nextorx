import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser, toJsonError } from "@/lib/api";
import { env } from "@/env";
import { prisma } from "@/lib/db";
import {
  createGatewayDepositRequest,
  DepositError,
  GATEWAY_METHOD,
} from "@/lib/services/deposits";
import {
  buildOuterOrderSn,
  createPaymentOrder,
  isRedotPayConfigured,
  RedotPayError,
} from "@/lib/redotpay";

const schema = z.object({
  amount: z.number().int().min(100),
  promoCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    if (!isRedotPayConfigured()) {
      return Response.json({ error: "Card/crypto checkout is not available right now" }, { status: 503 });
    }

    const gatewayRef = buildOuterOrderSn();
    const deposit = await createGatewayDepositRequest(
      user.id,
      parsed.data.amount,
      gatewayRef,
      parsed.data.promoCode,
    );

    const orderAmount = parsed.data.amount / 100;
    let redirectUrl: string;
    try {
      const order = await createPaymentOrder({
        outerOrderSn: gatewayRef,
        outerUid: user.id.slice(0, 32),
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
      // Never leave PENDING rows that can never complete — they would pollute
      // the admin panel and count toward daily limits.
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
  } catch (e) {
    return toJsonError(e);
  }
}
