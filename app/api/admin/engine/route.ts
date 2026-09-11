import { requirePermission, toJsonError } from "@/lib/api";
import { getOTCEngine } from "@/lib/otc-engine";

export async function GET() {
  try {
    await requirePermission("pair", "list");
    const engine = await getOTCEngine();
    return Response.json(await engine.getHealth());
  } catch (e) {
    return toJsonError(e);
  }
}
