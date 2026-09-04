import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getActiveExclusion } from "@/lib/self-exclusion";

const ALLOWED_DAYS = [1, 7, 30, 90, 180, 365];

export async function GET() {
  try {
    const user = await requireUser();
    const exclusion = await getActiveExclusion(user.id);
    return Response.json({ exclusion });
  } catch (e) {
    return toJsonError(e);
  }
}

const schema = z.object({ days: z.number().int().refine((d) => ALLOWED_DAYS.includes(d), "Invalid period") });

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    const existing = await getActiveExclusion(user.id);
    if (existing) {
      return Response.json({ error: "Self-exclusion already active and cannot be shortened" }, { status: 400 });
    }
    const excludedUntil = new Date(Date.now() + parsed.data.days * 24 * 60 * 60 * 1000);
    const exclusion = await prisma.selfExclusion.upsert({
      where: { userId: user.id },
      create: { userId: user.id, excludedUntil },
      update: { excludedUntil },
    });
    return Response.json({ exclusion }, { status: 201 });
  } catch (e) {
    return toJsonError(e);
  }
}
