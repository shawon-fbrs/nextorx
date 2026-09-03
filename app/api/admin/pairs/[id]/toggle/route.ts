import { NextRequest } from "next/server";
import { requirePermission, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/services/audit";
import { getOTCEngine } from "@/lib/otc-engine";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requirePermission("pair", "update");
    const { id } = await params;

    const existing = await prisma.pair.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Pair not found" }, { status: 404 });
    }

    const newisActive = !existing.isActive;

    const pair = await prisma.pair.update({
      where: { id },
      data: { isActive: newisActive },
    });

    try {
      const engine = await getOTCEngine();
      if (newisActive) {
        await engine.addPair(id);
      } else {
        await engine.removePair(id);
      }
    } catch {}

    await logAudit(admin.id, "pair.toggle", "Pair", pair.id, { isActive: newisActive });

    return Response.json({ pair });
  } catch (e) {
    return toJsonError(e);
  }
}
