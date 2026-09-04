import { NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission, toJsonError } from "@/lib/api";
import { logAudit } from "@/lib/services/audit";
import {
  getSettlementBacklog,
  getSettlementStatus,
  setSettlementPaused,
} from "@/lib/settlement-worker";

const toggleSchema = z.object({ paused: z.boolean() });

export async function GET() {
  try {
    await requirePermission("settings", "read");
    const [backlog, settlement] = await Promise.all([
      getSettlementBacklog(),
      Promise.resolve(getSettlementStatus()),
    ]);
    return Response.json({ backlog, ...settlement });
  } catch (e) {
    return toJsonError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requirePermission("settings", "manage");
    const parsed = toggleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    setSettlementPaused(parsed.data.paused);
    await logAudit(admin.id, "settlement.pause", "Settlement", "worker", {
      paused: parsed.data.paused,
    });
    return Response.json({ ok: true, paused: parsed.data.paused });
  } catch (e) {
    return toJsonError(e);
  }
}
