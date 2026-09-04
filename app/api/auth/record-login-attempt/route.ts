import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clearFailedLogins, recordFailedLogin } from "@/lib/login-security";

const schema = z.object({
  email: z.string().email(),
  success: z.boolean(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      undefined;
    if (parsed.data.success) {
      await clearFailedLogins(parsed.data.email);
    } else {
      await recordFailedLogin(parsed.data.email, ip);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
