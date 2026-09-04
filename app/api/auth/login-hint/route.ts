import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: {
        id: true,
        accounts: { select: { providerId: true } },
      },
    });
    if (!user) return NextResponse.json({ methods: [] });
    const methods = Array.from(
      new Set(
        user.accounts.map((a) => (a.providerId === "credential" ? "password" : a.providerId)),
      ),
    );
    return NextResponse.json({ methods });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
