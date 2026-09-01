import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser, toJsonError } from "@/lib/api";
import { requestWithdrawal } from "@/lib/services/withdrawals";

const withdrawSchema = z.object({
  amount: z.number().int().min(100),
  method: z.string(),
  walletAddress: z.string().min(1),
  network: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = withdrawSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    const withdrawal = await requestWithdrawal(
      user.id,
      parsed.data.amount,
      parsed.data.method,
      parsed.data.walletAddress,
      parsed.data.network,
    );

    return Response.json({ withdrawal }, { status: 201 });
  } catch (e) {
    return toJsonError(e);
  }
}
