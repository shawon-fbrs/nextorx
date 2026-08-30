import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser, toJsonError } from "@/lib/api";
import { createDepositRequest } from "@/lib/services/deposits";

const depositSchema = z.object({
  amount: z.number().int().min(100),
  method: z.string(),
  txHash: z.string().min(1),
  walletAddress: z.string().optional(),
  network: z.string().optional(),
  promoCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = depositSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    const deposit = await createDepositRequest(
      user.id,
      parsed.data.amount,
      parsed.data.method,
      parsed.data.txHash,
      parsed.data.walletAddress,
      parsed.data.network,
      parsed.data.promoCode,
    );

    return Response.json({ deposit }, { status: 201 });
  } catch (e) {
    return toJsonError(e);
  }
}
