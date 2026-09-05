import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser, toJsonError, parseListQuery } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { limit } = parseListQuery(request.nextUrl, undefined, 50);
    const [notifications, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { id: true, type: true, title: true, body: true, readAt: true, createdAt: true },
      }),
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);
    return Response.json({ notifications, unread });
  } catch (e) {
    return toJsonError(e);
  }
}

const readSchema = z.object({
  ids: z.array(z.string().min(1)).max(50).optional(),
  all: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = readSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    if (parsed.data.all) {
      await prisma.notification.updateMany({
        where: { userId: user.id, readAt: null },
        data: { readAt: new Date() },
      });
    } else if (parsed.data.ids) {
      await prisma.notification.updateMany({
        where: { userId: user.id, id: { in: parsed.data.ids } },
        data: { readAt: new Date() },
      });
    }
    return Response.json({ ok: true });
  } catch (e) {
    return toJsonError(e);
  }
}
