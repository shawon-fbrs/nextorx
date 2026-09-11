import { requirePermission, toJsonError } from "@/lib/api";
import { getOTCEngine } from "@/lib/otc-engine";

export async function GET() {
  try {
    await requirePermission("pair", "list");
    const engine = await getOTCEngine();
    return Response.json(engine.getStatus());
  } catch (e) {
    return toJsonError(e);
  }
}
