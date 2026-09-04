import { NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission, toJsonError, parseListQuery } from "@/lib/api";
import { logAudit } from "@/lib/services/audit";
import { prisma } from "@/lib/db";
import { approveWithdrawal, rejectWithdrawal, markWithdrawalPaid } from "@/lib/services/withdrawals";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), id: z.string(), note: z.string().optional() }),
  z.object({ action: z.literal("reject"), id: z.string(), note: z.string().optional() }),
  z.object({ action: z.literal("paid"), id: z.string() }),
]);

export async function GET(request: NextRequest) {
  try {
    await requirePermission("withdrawal", "list");
    const { status, limit } = parseListQuery(request.nextUrl, ["PENDING", "APPROVED", "REJECTED", "PAID"]);

    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: { status: (status ?? "PENDING") as "PENDING" },
      orderBy: { createdAt: "asc" },
      take: Math.min(limit, 200),
      include: {
        user: { select: { id: true, name: true, email: true, balance: true } },
        reviewedBy: { select: { id: true, name: true } },
        hold: true,
      },
    });

    return Response.json({ withdrawals });
  } catch (e) {
    return toJsonError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requirePermission("withdrawal", "approve");
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    const { action, id } = parsed.data;
    const note = "note" in parsed.data ? parsed.data.note : undefined;

    switch (action) {
      case "approve": {
        const w = await approveWithdrawal(id, admin.id, note);
        await logAudit(admin.id, "withdrawal.approve", "WithdrawalRequest", id, { note });
        return Response.json({ ok: true, withdrawal: w });
      }
      case "reject": {
        const w = await rejectWithdrawal(id, admin.id, note);
        await logAudit(admin.id, "withdrawal.reject", "WithdrawalRequest", id, { note });
        return Response.json({ ok: true, withdrawal: w });
      }
      case "paid": {
        const w = await markWithdrawalPaid(id, admin.id);
        await logAudit(admin.id, "withdrawal.paid", "WithdrawalRequest", id);
        return Response.json({ ok: true, withdrawal: w });
      }
    }
  } catch (e) {
    return toJsonError(e);
  }
}
