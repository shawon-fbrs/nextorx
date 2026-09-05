import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, type RateLimitRule } from "@/lib/rate-limit";

const ADMIN_ROLES = new Set([
  "super_admin",
  "finance",
  "support",
  "risk",
]);

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/setup-2fa",
  "/2fa-verify",
  "/auth/post-login",
  "/api/auth",
  "/api/health",
  "/api/market",
  "/api/trade/payment-methods",
  "/_next",
  "/favicon.ico",
];

const RATE_LIMITS: Array<{ match: (pathname: string, method: string) => boolean; rule: RateLimitRule }> = [
  { match: (p, m) => m === "POST" && p === "/api/auth/verify-email", rule: { max: 3, windowMs: 5 * 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/auth/send-verification", rule: { max: 3, windowMs: 5 * 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/auth/forgot-password", rule: { max: 3, windowMs: 15 * 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/auth/set-password", rule: { max: 5, windowMs: 15 * 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/auth/2fa", rule: { max: 10, windowMs: 5 * 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/auth/change-password", rule: { max: 5, windowMs: 15 * 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/auth/delete-account", rule: { max: 5, windowMs: 15 * 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/auth/reset-password", rule: { max: 5, windowMs: 15 * 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/trade/deposit", rule: { max: 10, windowMs: 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/auth/check-login", rule: { max: 10, windowMs: 5 * 60 * 1000 } },
  { match: (p, m) => m === "GET" && p === "/api/market/verify/download", rule: { max: 10, windowMs: 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/auth/login-hint", rule: { max: 5, windowMs: 15 * 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/auth/record-login-attempt", rule: { max: 10, windowMs: 5 * 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/account/kyc", rule: { max: 3, windowMs: 60 * 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/trade/trades", rule: { max: 10, windowMs: 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/trade/withdraw", rule: { max: 3, windowMs: 60 * 60 * 1000 } },
];

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  for (const p of PUBLIC_PATHS) {
    if (pathname === p || pathname.startsWith(p + "/")) return true;
  }
  return false;
}

function isAdminRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/console-panel") ||
    pathname.startsWith("/api/admin")
  );
}

function getSessionDataCookie(request: NextRequest): string | undefined {
  return (
    request.cookies.get("__Secure-better-auth.session_data")?.value ||
    request.cookies.get("better-auth.session_data")?.value
  );
}

function getSessionTokenCookie(request: NextRequest): string | undefined {
  return (
    request.cookies.get("__Secure-better-auth.session_token")?.value ||
    request.cookies.get("better-auth.session_token")?.value
  );
}

function base64UrlDecode(input: string): ArrayBuffer {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function verifyCompactCacheSignature(
  data: { session: Record<string, unknown>; expiresAt: number },
  signature: string,
  secret: string,
): Promise<boolean> {
  const payload = JSON.stringify({ ...data.session, expiresAt: data.expiresAt });
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
    const sigBytes = new Uint8Array(base64UrlDecode(signature));
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    encoder.encode(payload),
  );
  return valid;
}

async function extractUserRoleFromCache(
  request: NextRequest,
): Promise<string | null> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) return null;

  const cookieValue = getSessionDataCookie(request);
  if (!cookieValue) return null;

  try {
    const decoded = new TextDecoder().decode(base64UrlDecode(cookieValue));
    const parsed = JSON.parse(decoded);
    if (!parsed || !parsed.session || !parsed.signature) return null;

    const valid = await verifyCompactCacheSignature(
      parsed,
      parsed.signature,
      secret,
    );
    if (!valid) return null;

    if (typeof parsed.expiresAt === "number" && parsed.expiresAt < Date.now()) {
      return null;
    }

    const user = parsed.session?.user;
    if (user && typeof user.role === "string") {
      return user.role;
    }
    return null;
  } catch {
    return null;
  }
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  for (const { match, rule } of RATE_LIMITS) {
    if (match(pathname, request.method)) {
      const key = `${getClientIP(request)}:${request.method}:${pathname}`;
      if (!checkRateLimit(key, rule)) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 },
        );
      }
      break;
    }
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const sessionToken = getSessionTokenCookie(request);
  if (!sessionToken) {
    return redirectToLogin(request);
  }

  if (isAdminRoute(pathname)) {
    const role = await extractUserRoleFromCache(request);
    if (!role || !ADMIN_ROLES.has(role)) {
      return NextResponse.redirect(new URL("/trade/demo", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|ws|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
