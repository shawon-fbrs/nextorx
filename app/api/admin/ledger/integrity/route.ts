import { NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission, toJsonError } from "@/lib/api";
import { verifyLedgerIntegrity } from "@/lib/ledger";

const querySchema = z.object({ userId: z.string().min(1) });

export async function GET(request: NextRequest) {
  try {
    await requirePermission("user", "list");
    const parsed = querySchema.safeParse({
      userId: request.nextUrl.searchParams.get("userId"),
    });
    if (!parsed.success) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }
    const result = await verifyLedgerIntegrity(parsed.data.userId);
    return Response.json({ userId: parsed.data.userId, ...result });
  } catch (e) {
    return toJsonError(e);
  }
}
