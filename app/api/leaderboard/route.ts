import { prisma } from "@/lib/db";
import { requireUser, toJsonError } from "@/lib/api";

const TOP_N = 10;

export async function GET() {
  try {
    const user = await requireUser();
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const settled = await prisma.trade.findMany({
      where: { status: { in: ["WON", "LOST"] }, settledAt: { gte: dayStart } },
      select: { userId: true, status: true, profit: true, amount: true },
    });

    const nets = new Map<string, number>();
    const winsByUser = new Map<string, number>();
    const playedByUser = new Map<string, number>();
    for (const t of settled) {
      playedByUser.set(t.userId, (playedByUser.get(t.userId) ?? 0) + 1);
      if (t.status === "WON") {
        nets.set(t.userId, (nets.get(t.userId) ?? 0) + (t.profit ?? 0));
        winsByUser.set(t.userId, (winsByUser.get(t.userId) ?? 0) + 1);
      } else {
        nets.set(t.userId, (nets.get(t.userId) ?? 0) - t.amount);
      }
    }

    const userIds = [...nets.keys()];
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, nickname: true },
        })
      : [];
    const userById = new Map<string, { name: string; nickname: string | null }>();
    for (const u of users as Array<{ id: string; name: string; nickname: string | null }>) {
      userById.set(u.id, { name: u.name, nickname: u.nickname });
    }

    const ranked = [...nets.entries()]
      .map(([uid, net]) => ({
        userId: uid,
        name: userById.get(uid)?.name ?? "Trader",
        nickname: userById.get(uid)?.nickname ?? null,
        net,
        wins: winsByUser.get(uid) ?? 0,
        played: playedByUser.get(uid) ?? 0,
      }))
      .sort((a, b) => b.net - a.net);

    const top = ranked.filter((e) => e.net > 0).slice(0, TOP_N);
    const my = ranked.find((r) => r.userId === user.id) ?? null;
    const myRank = my ? ranked.indexOf(my) + 1 : 0;

    return Response.json({ top, my, myRank });
  } catch (e) {
    return toJsonError(e);
  }
}
