import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";

const schema = z.object({
  depositLimitDaily: z.number().int().min(0).max(100000000).nullable(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { depositLimitDaily: true },
    });
    return Response.json({ depositLimitDaily: profile?.depositLimitDaily ?? null });
  } catch (e) {
    return toJsonError(e);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { depositLimitDaily: parsed.data.depositLimitDaily },
    });
    return Response.json({ ok: true, depositLimitDaily: parsed.data.depositLimitDaily });
  } catch (e) {
    return toJsonError(e);
  }
}
