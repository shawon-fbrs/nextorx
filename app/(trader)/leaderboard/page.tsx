import Link from "next/link";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/db";

const TOP_N = 10;

type Earner = {
  userId: string;
  name: string;
  nickname: string | null;
  net: number;
  wins: number;
  played: number;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage() {
  const sessionUser = await verifySession();
  if (!sessionUser) redirect("/login");

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
  const userById = new Map(users.map((u) => [u.id, u]));

  const ranked: Earner[] = [...nets.entries()]
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
  const my = ranked.find((r) => r.userId === sessionUser.id) ?? null;
  const myRank = my ? ranked.indexOf(my) + 1 : 0;

  const renderRow = (e: Earner, i: number) => {
    const isMe = e.userId === sessionUser.id;
    return (
      <div key={e.userId} className={`flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-b-0 ${isMe ? "bg-blue/5" : ""}`}>
        <div className="w-7 text-center flex-shrink-0">
          {i < 3 ? (
            <span className="text-lg">{MEDALS[i]}</span>
          ) : (
            <span className="text-sm font-bold text-textDark">{i + 1}</span>
          )}
        </div>
        <div className="w-9 h-9 rounded-full bg-blue/20 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-blue">{initials(e.nickname || e.name)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {e.nickname || e.name}
            {isMe && <span className="ml-1.5 text-[10px] font-bold text-blue">you</span>}
          </p>
          <p className="text-[11px] text-textDark">{e.wins} win{e.wins === 1 ? "" : "s"} · {e.played} played</p>
        </div>
        <p className={`text-sm font-bold ${e.net >= 0 ? "text-green" : "text-red"}`}>
          {e.net >= 0 ? "+" : "−"}${(Math.abs(e.net) / 100).toFixed(2)}
        </p>
      </div>
    );
  };

  return (
    <div className="bg-background text-text h-full overflow-y-auto">
      <div className="px-6 py-6 max-w-2xl mx-auto">
        <Link href="/more" className="text-xs text-blue font-semibold">← Back</Link>
        <div className="flex items-end justify-between mt-2 mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Leaderboard</h1>
            <p className="text-sm text-text-dark mt-1">Top earners by net profit today</p>
          </div>
          <span className="text-[10px] font-bold text-orange bg-orange/10 px-2.5 py-1 rounded-full">Resets at midnight</span>
        </div>

        {my && (
          <div className="bg-surface border border-blue/30 rounded-xl overflow-hidden mb-4">
            <div className="px-4 py-2 border-b border-border flex justify-between items-center">
              <span className="text-xs font-bold text-white">Your position</span>
              <span className="text-xs font-bold text-blue">Rank #{myRank}</span>
            </div>
            {renderRow(my, myRank - 1)}
          </div>
        )}

        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-xs font-bold text-white">Top {top.length}</span>
          </div>
          {top.length === 0 ? (
            <p className="text-xs text-text-dark text-center py-10">
              {my ? "No profitable traders yet today — you're early." : "No settled trades yet today. Place a trade to claim the top spot."}
            </p>
          ) : (
            top.map((e, i) => renderRow(e, i))
          )}
        </div>
        <p className="text-[11px] text-textDark text-center mt-3">Net = payouts − losses from settled trades today.</p>
      </div>
    </div>
  );
}
