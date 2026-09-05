import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";

const schema = z.object({ code: z.string().trim().min(4).max(16) });

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    const code = parsed.data.code.toUpperCase();
    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { referredBy: true, referralCode: true },
    });
    if (!me) return Response.json({ error: "User not found" }, { status: 404 });
    if (me.referredBy) return Response.json({ ok: true, already: true });
    if (me.referralCode === code) {
      return Response.json({ error: "You cannot refer yourself" }, { status: 400 });
    }
    const referrer = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!referrer) return Response.json({ error: "Invalid referral code" }, { status: 404 });
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { referredBy: code } });
      await tx.referral.upsert({
        where: { referredId: user.id },
        create: { referrerId: referrer.id, referredId: user.id },
        update: {},
      });
    });
    return Response.json({ ok: true });
  } catch (e) {
    return toJsonError(e);
  }
}
