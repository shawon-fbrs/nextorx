import { toJsonError } from "@/lib/api";
import { getPayoutBreakdown } from "@/lib/payout";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const breakdown = await getPayoutBreakdown(id);
    if (breakdown.base === 0 && breakdown.payout === 0) {
      return Response.json({ error: "Pair not found" }, { status: 404 });
    }
    return Response.json({ pairId: id, ...breakdown });
  } catch (e) {
    return toJsonError(e);
  }
}
