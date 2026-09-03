import { NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/services/audit";

const reorderSchema = z.object({
  pairIds: z.array(z.string()).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await requirePermission("pair", "update");
    const parsed = reorderSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    const { pairIds } = parsed.data;

    await prisma.$transaction(
      pairIds.map((id, index) =>
        prisma.pair.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    await logAudit(admin.id, "pair.reorder", "Pair", "bulk", { pairIds });

    return Response.json({ success: true });
  } catch (e) {
    return toJsonError(e);
  }
}
