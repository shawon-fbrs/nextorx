import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/env";

export class NowPaymentsError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export function isNowPaymentsConfigured(): boolean {
  return env.NOWPAYMENTS_API_KEY.trim().length > 0;
}

export type NowPaymentStatus =
  | "waiting"
  | "confirming"
  | "confirmed"
  | "sending"
  | "partially_paid"
  | "finished"
  | "failed"
  | "refunded"
  | "expired";

async function api<T>(method: "GET" | "POST", path: string, body?: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${env.NOWPAYMENTS_BASE_URL}/v1${path}`, {
      method,
      headers: {
        "x-api-key": env.NOWPAYMENTS_API_KEY,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    console.error(`[NOWPayments] ${path} network error:`, e instanceof Error ? e.message : e);
    throw new NowPaymentsError("Payment provider unreachable, please try again");
  }
  const json = (await res.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!res.ok || !json) {
    const msg =
      (json as { message?: string } | null)?.message ?? `Payment provider error (HTTP ${res.status})`;
    console.error(`[NOWPayments] ${path} failed:`, msg);
    throw new NowPaymentsError(msg, res.status);
  }
  return json;
}

export interface NowInvoice {
  id: string;
  invoice_url: string;
  order_id?: string;
  price_amount?: number;
  price_currency?: string;
  payment_status?: NowPaymentStatus;
  [key: string]: unknown;
}

export interface CreateInvoiceInput {
  orderId: string;
  amountUsd: number;
  description: string;
  ipnCallbackUrl: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<NowInvoice> {
  const invoice = await api<NowInvoice>("POST", "/invoice", {
    price_amount: input.amountUsd,
    price_currency: "usd",
    pay_currency: "usdttrc20",
    order_id: input.orderId,
    order_description: input.description,
    ipn_callback_url: input.ipnCallbackUrl,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });
  if (!invoice?.id || !invoice?.invoice_url) {
    throw new NowPaymentsError("No invoice URL returned");
  }
  return invoice;
}

export async function getInvoiceStatus(invoiceId: string): Promise<NowInvoice | null> {
  try {
    return await api<NowInvoice>("GET", `/invoice/${encodeURIComponent(invoiceId)}`);
  } catch {
    return null;
  }
}

// IPN verification — byte-exact reference scheme from NOWPayments docs:
// sort top-level keys, JSON.stringify with the sorted key array, HMAC-SHA512
// hex with the IPN secret, compare against x-nowpayments-sig.
export function verifyIpnSignature(
  parsedBody: Record<string, unknown>,
  signature: string | null,
): boolean {
  try {
    const secret = env.NOWPAYMENTS_IPN_SECRET.trim();
    if (!secret || !signature) return false;
    const canonical = JSON.stringify(parsedBody, Object.keys(parsedBody).sort());
    const computed = createHmac("sha512", secret).update(canonical, "utf8").digest("hex");
    const a = Buffer.from(computed, "utf8");
    const b = Buffer.from(signature.trim(), "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export interface NowIpn {
  payment_id?: number | string;
  payment_status?: NowPaymentStatus;
  pay_address?: string;
  price_amount?: number;
  price_currency?: string;
  pay_amount?: number;
  actually_paid?: number;
  pay_currency?: string;
  order_id?: string;
  order_description?: string;
  purchase_id?: string;
  outcome_amount?: number;
  outcome_currency?: string;
  [key: string]: unknown;
}
