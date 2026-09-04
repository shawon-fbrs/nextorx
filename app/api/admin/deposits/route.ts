import { NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission, toJsonError, parseListQuery } from "@/lib/api";
import { logAudit } from "@/lib/services/audit";
import { prisma } from "@/lib/db";
import { verifyDeposit, rejectDeposit } from "@/lib/services/deposits";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("verify"), id: z.string() }),
  z.object({ action: z.literal("reject"), id: z.string(), note: z.string().optional() }),
]);

export async function GET(request: NextRequest) {
  try {
    await requirePermission("deposit", "list");
    const { status, limit } = parseListQuery(request.nextUrl, ["PENDING", "VERIFIED", "REJECTED"]);

    const deposits = await prisma.depositRequest.findMany({
      where: { status: (status ?? "PENDING") as "PENDING" },
      orderBy: { createdAt: "asc" },
      take: Math.min(limit, 200),
      include: {
        user: { select: { id: true, name: true, email: true, balance: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
    });

    return Response.json({ deposits });
  } catch (e) {
    return toJsonError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requirePermission("deposit", "verify");
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    const { action, id } = parsed.data;

    switch (action) {
      case "verify": {
        const d = await verifyDeposit(id, admin.id);
        await logAudit(admin.id, "deposit.verify", "DepositRequest", id);
        return Response.json({ ok: true, deposit: d });
      }
      case "reject": {
        const d = await rejectDeposit(id, admin.id, parsed.data.note);
        await logAudit(admin.id, "deposit.reject", "DepositRequest", id, { note: parsed.data.note });
        return Response.json({ ok: true, deposit: d });
      }
    }
  } catch (e) {
    return toJsonError(e);
  }
}
