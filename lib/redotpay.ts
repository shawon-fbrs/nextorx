import { createSign, createVerify } from "crypto";
import { env } from "@/env";

export class RedotPayError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

export function isRedotPayConfigured(): boolean {
  return env.REDOTPAY_APP_KEY.trim().length > 0 && env.REDOTPAY_PRIVATE_KEY.trim().length > 0;
}

function isSandbox(): boolean {
  return env.REDOTPAY_BASE_URL.includes("sandbox");
}

// RedotPay PLATFORM public keys (for webhook verification). Public by design —
// published in RedotPay's own docs. Selected by environment + X-R-Key-Version.
const SANDBOX_PLATFORM_KEY_V1 = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuctrVK3eP8hpoJf7FMet
lcR77FYcj9HtrkySyGDRt5HHwdwgM8jK0kfE4ag/zI8goe8M0iJ2o7n3VCfTzn8O
yfU0bu6KzDti1WOJV9fv4XtSmhm9W4WKjIc8uDQViR7E8trzcrbKFVbKVGng1+z0
KobQBDtWhjUeXKktUq1lpiejTS+XjXej26ANPfwbqbY+/6kBB3sWbt9BLDI/WhPY
XnFV9oJWod9I/dYUgUUA/b/+bI1wlobNntBDxiNmX0kbqpGZbzO6l9wWFXZiFCD2
5QtBOZlMbn9noH4KW3DnKGc2nKNz/f2FEM9DJKn3P7NGFVy6O/Q5NzcbFs+DI6nT
ywIDAQAB
-----END PUBLIC KEY-----`;

const PROD_PLATFORM_KEY_V1 = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzMn4r06M/cp2amkbCxIs
PSr030JoCFeymwjTZrBnI8kW4mtL6JtUPYpJTFgCB8ZQoV75lEmUw8gSLbN770Cc
5EOi1dF4ekmLQ7Ez0SFUbQgJa7Vg5wBdSKcbUmkKGviJt+iZRJ0tZsPpXMPqIo9Y
OWJagfPbDhEwT2t1ANP4ou98sCqLqELI80iYm8+W4B9IvBW4lc+H5BAPtXpYMtlZ
6stCnvHXd1EjvlTak25v5xJ8AInEeAy8/D2glunmz/VfPyoB5OHPgnYVU66HyeQc
O1ZY/jzB5d6I/zX4JENG1xrP8ThPZ9qMWtmputJ0XYKymiZgZP6vh0L+G6P/Z98v
lQIDAQAB
-----END PUBLIC KEY-----`;

function platformPublicKey(version: string): string | null {
  if (version !== "1") return null;
  return isSandbox() ? SANDBOX_PLATFORM_KEY_V1 : PROD_PLATFORM_KEY_V1;
}

function loadPrivateKey(): string {
  const raw = env.REDOTPAY_PRIVATE_KEY.trim();
  // Coolify single-line secrets arrive with literal \n — restore real newlines.
  if (raw.includes("\\n") && !raw.includes("\n")) {
    return raw.replace(/\\n/g, "\n");
  }
  return raw;
}

function signRequest(method: string, uri: string, body: string, timestamp: number): string {
  const stringToSign = `${method} ${uri}\n${env.REDOTPAY_APP_KEY}.${timestamp}.${body}`;
  const signer = createSign("RSA-SHA256");
  signer.update(stringToSign, "utf8");
  return signer.sign(loadPrivateKey()).toString("base64");
}

async function postJson<T>(uri: string, payload: Record<string, unknown>): Promise<T> {
  // Single stringify — the SAME bytes are signed and sent (key order matters).
  const body = JSON.stringify(payload);
  const timestamp = Date.now();
  const res = await fetch(`${env.REDOTPAY_BASE_URL}${uri}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-R-Ak": env.REDOTPAY_APP_KEY,
      "X-R-Ts": String(timestamp),
      "X-R-Key-Version": env.REDOTPAY_KEY_VERSION,
      "X-R-Signature": signRequest("POST", uri, body, timestamp),
    },
    body,
    signal: AbortSignal.timeout(20000),
  });
  const json = (await res.json().catch(() => null)) as {
    code?: string;
    msg?: string;
    message?: string;
    requestId?: string;
    data?: T;
  } | null;
  if (!json || json.code !== "SUCCESS") {
    throw new RedotPayError(
      json?.msg ?? json?.message ?? `RedotPay request failed (HTTP ${res.status})`,
      json?.code,
    );
  }
  return json.data as T;
}

export interface RedotPayPaymentMethod {
  id: string;
  name: string;
  manual: boolean;
  webUrl?: string;
  [key: string]: unknown;
}

export interface RedotPayCreateOrderResult {
  orderSn: string;
  outerOrderSn: string;
  webUrl?: string;
  h5Url?: string;
  appUrl?: string;
  paymentMethods?: RedotPayPaymentMethod[];
}

export interface CreateOrderInput {
  outerOrderSn: string;
  outerUid: string;
  orderAmount: number;
  orderCurrency: string;
  orderDesc: string;
  redirectUrl: string;
  timeExpire: number;
}

export function buildOuterOrderSn(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase().replace(/[^A-Z0-9]/g, "X");
  return `DP-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

export async function createPaymentOrder(input: CreateOrderInput): Promise<RedotPayCreateOrderResult> {
  return postJson<RedotPayCreateOrderResult>("/openapi/v2/order/create", {
    outerOrderSn: input.outerOrderSn,
    outerUid: input.outerUid,
    orderAmount: input.orderAmount,
    orderCurrency: input.orderCurrency,
    timeExpire: input.timeExpire,
    env: "WEB",
    orderDesc: input.orderDesc,
    goods: [
      {
        goodsType: "02",
        goodsCategory: "Z000",
        goodsCode: "DEPOSIT",
        goodsName: "Account Deposit",
        goodsCount: 1,
        goodsAmount: input.orderAmount,
        goodsCoin: "USDT",
      },
    ],
    redirectUrl: input.redirectUrl,
    merchantName: env.REDOTPAY_MERCHANT_NAME,
  });
}

export interface RedotPayWebhook {
  outerOrderSn?: string;
  outerOrder?: string;
  orderSn?: string;
  preSn?: string;
  orderAmount?: number;
  orderCurrency?: string;
  cryptoAmount?: number;
  cryptoCurrency?: string;
  billAmount?: number;
  billCurrency?: string;
  txId?: string;
  orderStatus?: number;
  paymentTime?: number;
  [key: string]: unknown;
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  keyVersion: string | null,
): boolean {
  try {
    if (!signature || !timestamp || !keyVersion) return false;
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) return false;
    const pubKey = platformPublicKey(keyVersion);
    if (!pubKey) return false;
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${env.REDOTPAY_APP_KEY}.${timestamp}.${rawBody}`, "utf8");
    return verifier.verify(pubKey, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}

export async function queryOrderByOuterSn(outerOrderSn: string): Promise<Record<string, unknown> | null> {
  try {
    const data = await postJson<Record<string, unknown>[]>("/openapi/v2/order/list", {
      outerOrderSnList: [outerOrderSn],
      pageNo: 1,
      pageSize: 10,
    });
    return Array.isArray(data) ? (data[0] ?? null) : null;
  } catch {
    return null;
  }
}
