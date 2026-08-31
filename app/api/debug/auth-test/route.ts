import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "info";

    if (action === "info") {
      return NextResponse.json({
        status: "ok",
        message: "Auth debug endpoint. Use ?action=sign-up to test sign-up",
        env: {
          BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
          NODE_ENV: process.env.NODE_ENV,
          hasSecret: !!process.env.BETTER_AUTH_SECRET,
          secretLength: process.env.BETTER_AUTH_SECRET?.length,
        },
      });
    }

    return NextResponse.json({ status: "ok", action });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "email and password required" }, { status: 400 });
    }

    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: name || email.split("@")[0],
      },
      headers: req.headers,
    });

    return NextResponse.json({ result });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e.message,
        name: e.name,
        code: e.code,
        status: e.status,
        body: e.body,
        stack: process.env.NODE_ENV !== "production" ? e.stack : undefined,
      },
      { status: e.status || 500 }
    );
  }
}
