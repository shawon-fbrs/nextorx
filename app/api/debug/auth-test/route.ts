import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "ok",
    env: {
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
      NODE_ENV: process.env.NODE_ENV,
      hasSecret: !!process.env.BETTER_AUTH_SECRET,
      secretLength: process.env.BETTER_AUTH_SECRET?.length,
      hasGoogleId: !!process.env.GOOGLE_CLIENT_ID,
      googleIdLength: process.env.GOOGLE_CLIENT_ID?.length,
      hasGoogleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      googleSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length,
    },
    usage: {
      "GET /api/debug/auth-test": "This info",
      "POST /api/debug/auth-test { action: 'sign-up', email, password }": "Test signUp",
      "POST /api/debug/auth-test { action: 'sign-in', email, password }": "Test signIn",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = "sign-up", email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "email and password required" }, { status: 400 });
    }

    if (action === "sign-up") {
      const result = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name: name || email.split("@")[0],
        },
        headers: req.headers,
      });
      return NextResponse.json({ action: "sign-up", result });
    }

    if (action === "sign-in") {
      const result = await auth.api.signInEmail({
        body: { email, password },
        headers: req.headers,
      });
      return NextResponse.json({ action: "sign-in", result });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (e: any) {
    const statusCode = typeof e.status === "number" && e.status >= 200 && e.status <= 599
      ? e.status
      : typeof e.statusCode === "number" && e.statusCode >= 200 && e.statusCode <= 599
        ? e.statusCode
        : 500;
    return NextResponse.json(
      {
        error: e.message,
        name: e.name,
        code: e.code,
        status: e.status,
        statusCode: e.statusCode,
        body: e.body,
        stack: process.env.NODE_ENV !== "production" ? e.stack : undefined,
      },
      { status: statusCode }
    );
  }
}
