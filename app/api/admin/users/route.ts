import { NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission, toJsonError, parseListQuery } from "@/lib/api";
import { logAudit } from "@/lib/services/audit";
import { prisma } from "@/lib/db";
import { credit, debit } from "@/lib/ledger";

const userActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("ban"),
    userId: z.string(),
    reason: z.string().min(3),
    expiresAt: z.string().datetime().optional(),
  }),
  z.object({ action: z.literal("unban"), userId: z.string() }),
  z.object({ action: z.literal("2fa-reset"), userId: z.string(), note: z.string().min(3) }),
  z.object({
    action: z.literal("set-role"),
    userId: z.string(),
    role: z.enum(["player", "finance", "support", "risk", "super_admin"]),
  }),
  z.object({
    action: z.literal("adjust-balance"),
    userId: z.string(),
    amountUsd: z.number().finite(),
    note: z.string().min(3),
  }),
]);

export async function GET(request: NextRequest) {
  try {
    await requirePermission("user", "list");
    const q = request.nextUrl.searchParams.get("q") ?? "";
    const { limit } = parseListQuery(request.nextUrl);

    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
              { referralCode: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 200),
      select: {
        id: true,
        uid: true,
        name: true,
        email: true,
        role: true,
        balance: true,
        bonusBalance: true,
        kycStatus: true,
        banned: true,
        referralCode: true,
        createdAt: true,
        _count: { select: { ledgerEntries: true, deposits: true, withdrawals: true, trades: true } },
      },
    });

    return Response.json({ users });
  } catch (e) {
    return toJsonError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requirePermission("user", "update");
    const parsed = userActionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    const { action } = parsed.data;

    if (action === "adjust-balance") {
      const amount = Math.round(Math.abs(parsed.data.amountUsd) * 100);
      const isCredit = parsed.data.amountUsd >= 0;
      if (isCredit) {
        await credit({
          userId: parsed.data.userId,
          type: "ADMIN_ADJUSTMENT",
          amount,
          referenceId: `admin-${admin.id}-${Date.now()}`,
          description: parsed.data.note,
        });
      } else {
        await debit({
          userId: parsed.data.userId,
          type: "ADMIN_ADJUSTMENT",
          amount,
          referenceId: `admin-${admin.id}-${Date.now()}`,
          description: parsed.data.note,
        });
      }
      await logAudit(admin.id, "user.adjust-balance", "User", parsed.data.userId, {
        amountUsd: parsed.data.amountUsd,
        note: parsed.data.note,
      });
      return Response.json({ ok: true });
    }

    if (action === "ban") {
      await prisma.user.update({
        where: { id: parsed.data.userId },
        data: {
          banned: true,
          banReason: parsed.data.reason,
          banExpires: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        },
      });
      await logAudit(admin.id, "user.ban", "User", parsed.data.userId, { reason: parsed.data.reason });
      return Response.json({ ok: true });
    }

    if (action === "unban") {
      await prisma.user.update({
        where: { id: parsed.data.userId },
        data: { banned: false, banReason: null, banExpires: null },
      });
      await logAudit(admin.id, "user.unban", "User", parsed.data.userId);
      return Response.json({ ok: true });
    }

    if (action === "2fa-reset") {
      await prisma.$transaction(async (tx) => {
        await tx.twoFactor.deleteMany({ where: { userId: parsed.data.userId } });
        await tx.user.update({
          where: { id: parsed.data.userId },
          data: { twoFactorEnabled: false },
        });
      });
      await logAudit(admin.id, "user.2fa-reset", "User", parsed.data.userId, {
        note: parsed.data.note,
      });
      return Response.json({ ok: true });
    }

    if (admin.role !== "super_admin") {
      return Response.json({ error: "Only super_admin can change roles" }, { status: 403 });
    }
    if (parsed.data.userId === admin.id) {
      return Response.json({ error: "Cannot change your own role" }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { role: parsed.data.role },
    });
    await logAudit(admin.id, "user.set-role", "User", parsed.data.userId, { role: parsed.data.role });
    return Response.json({ ok: true });
  } catch (e) {
    return toJsonError(e);
  }
}
