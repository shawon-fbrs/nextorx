import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, type RateLimitRule } from "@/lib/rate-limit";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verify",
  "/privacy",
  "/terms",
  "/setup-2fa",
  "/2fa-verify",
  "/auth/post-login",
  "/api/auth",
  "/api/health",
  "/api/market",
  "/api/verify/day",
  "/api/trade/payment-methods",
  "/_next",
  "/favicon.ico",
];

const RATE_LIMITS: Array<{ match: (pathname: string, method: string) => boolean; rule: RateLimitRule }> = [
  { match: (p, m) => m === "POST" && p === "/api/auth/verify-email", rule: { max: 3, windowMs: 5 * 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/auth/send-verification", rule: { max: 3, windowMs: 5 * 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/auth/forgot-password", rule: { max: 5, windowMs: 15 * 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/auth/set-password", rule: { max: 5, windowMs: 15 * 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/auth/2fa", rule: { max: 10, windowMs: 5 * 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/auth/change-password", rule: { max: 5, windowMs: 15 * 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/auth/delete-account", rule: { max: 5, windowMs: 15 * 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/auth/reset-password", rule: { max: 5, windowMs: 15 * 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/trade/deposit", rule: { max: 10, windowMs: 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/trade/deposit/create-order", rule: { max: 10, windowMs: 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/trade/deposit/sync", rule: { max: 10, windowMs: 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/auth/check-login", rule: { max: 10, windowMs: 5 * 60 * 1000 } },
  { match: (p, m) => m === "GET" && p.includes("/api/market/pairs/") && p.endsWith("/payout"), rule: { max: 30, windowMs: 60 * 1000 } },
  { match: (p, m) => m === "GET" && p === "/api/market/payouts", rule: { max: 30, windowMs: 60 * 1000 } },
  { match: (p, m) => m === "GET" && p === "/api/market/verify/download", rule: { max: 10, windowMs: 60 * 1000 } },
  { match: (p, m) => m === "GET" && p === "/api/market/verify/regime", rule: { max: 20, windowMs: 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/auth/login-hint", rule: { max: 5, windowMs: 15 * 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/auth/record-login-attempt", rule: { max: 10, windowMs: 5 * 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/account/kyc", rule: { max: 3, windowMs: 60 * 60 * 1000 } },
  { match: (p, m) => m === "POST" && p === "/api/trade/trades", rule: { max: 60, windowMs: 60 * 1000 } },
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

function getSessionTokenCookie(request: NextRequest): string | undefined {
  return (
    request.cookies.get("__Secure-better-auth.session_token")?.value ||
    request.cookies.get("better-auth.session_token")?.value
  );
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

  // Admin authorization is enforced server-side (console-panel layout checks
  // session + role + 2FA; /api/admin routes use requirePermission). The proxy
  // deliberately does NOT parse the role out of cookies here — a previous
  // revision did that via the signed session_data cache and locked out
  // legitimate admins with a redirect loop, so the proxy only gates on
  // session presence.

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|ws|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
