import { prisma } from "@/lib/db";
import { debit, credit, postEntryInTx } from "@/lib/ledger";
import { createNotification } from "@/lib/notify";
import { ensurePlatformAccount } from "@/lib/platform";
import { VAULT_ACCOUNT_ID } from "@/lib/vault";

export class WithdrawalError extends Error {}

export async function getWithdrawableBalance(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new WithdrawalError("User not found");
  return user.balance;
}

export async function requestWithdrawal(
  userId: string,
  amount: number,
  method: string,
  walletAddress: string,
  network?: string,
) {
  const paymentMethod = await prisma.paymentMethod.findFirst({
    where: { name: method },
  });
  const minWithdraw = paymentMethod?.minWithdraw ?? 500;
  if (amount < minWithdraw) {
    throw new WithdrawalError(`Minimum withdrawal is $${(minWithdraw / 100).toFixed(2)}`);
  }
  const maxWithdraw = paymentMethod?.maxWithdraw ?? 10000000;
  if (amount > maxWithdraw) {
    throw new WithdrawalError(`Maximum withdrawal is $${(maxWithdraw / 100).toFixed(2)}`);
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new WithdrawalError("User not found");
    if (user.balance < amount) {
      throw new WithdrawalError("Insufficient balance");
    }

    const withdrawal = await tx.withdrawalRequest.create({
      data: {
        userId,
        amount,
        method,
        network,
        walletAddress,
      },
    });

    try {
      await debit({
        userId,
        type: "WITHDRAWAL_HOLD",
        amount,
        referenceId: withdrawal.id,
        description: `Withdrawal hold (${method})`,
      });
    } catch (e) {
      await tx.withdrawalRequest.delete({ where: { id: withdrawal.id } });
      throw e;
    }

    await tx.walletHold.create({
      data: {
        userId,
        withdrawalId: withdrawal.id,
        amount,
      },
    });

    return withdrawal;
  });
}

export async function rejectWithdrawal(
  withdrawalId: string,
  reviewedById: string,
  note?: string,
) {
  return prisma.$transaction(async (tx) => {
    const withdrawal = await tx.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: { hold: true },
    });
    if (!withdrawal) throw new WithdrawalError("Withdrawal not found");
    if (withdrawal.status !== "PENDING") {
      throw new WithdrawalError(`Withdrawal already ${withdrawal.status.toLowerCase()}`);
    }
    if (!withdrawal.hold || withdrawal.hold.status !== "HELD") {
      throw new WithdrawalError("No active hold on this withdrawal");
    }

    await credit({
      userId: withdrawal.userId,
      type: "WITHDRAWAL_RELEASE",
      amount: withdrawal.amount,
      referenceId: withdrawal.id,
      description: "Withdrawal rejected — balance restored",
    });

    await tx.walletHold.update({
      where: { id: withdrawal.hold.id },
      data: { status: "RELEASED", releasedAt: new Date() },
    });

    const result = await tx.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        status: "REJECTED",
        reviewedById,
        reviewedAt: new Date(),
        note,
      },
    });
    await createNotification(
      withdrawal.userId,
      "WITHDRAWAL",
      "Withdrawal rejected",
      `Your withdrawal was rejected${note ? `: ${note}` : ""}. Balance restored.`,
    );
    return result;
  });
}

export async function approveWithdrawal(
  withdrawalId: string,
  reviewedById: string,
  note?: string,
) {
  return prisma.$transaction(async (tx) => {
    const withdrawal = await tx.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
    });
    if (!withdrawal) throw new WithdrawalError("Withdrawal not found");
    if (withdrawal.status !== "PENDING") {
      throw new WithdrawalError(`Withdrawal already ${withdrawal.status.toLowerCase()}`);
    }

    const result = await tx.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        status: "APPROVED",
        reviewedById,
        reviewedAt: new Date(),
        note,
      },
    });
    await createNotification(
      withdrawal.userId,
      "WITHDRAWAL",
      "Withdrawal approved",
      `Your withdrawal is approved — money is being sent.`,
    );
    return result;
  });
}

export async function markWithdrawalPaid(
  withdrawalId: string,
  reviewedById: string,
) {
  await ensurePlatformAccount();
  return prisma.$transaction(async (tx) => {
    const withdrawal = await tx.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: { hold: true },
    });
    if (!withdrawal) throw new WithdrawalError("Withdrawal not found");
    if (withdrawal.status !== "APPROVED") {
      throw new WithdrawalError("Withdrawal must be approved first");
    }
    if (withdrawal.hold) {
      await tx.walletHold.update({
        where: { id: withdrawal.hold.id },
        data: { status: "SETTLED", releasedAt: new Date() },
      });
    }

    await postEntryInTx(tx, {
      userId: VAULT_ACCOUNT_ID,
      type: "WITHDRAWAL_DEBIT",
      amount: withdrawal.amount,
      debit: true,
      allowNegative: true,
      referenceId: withdrawal.id,
      description: `Withdrawal paid (${withdrawal.method})`,
    });

    const result = await tx.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        status: "PAID",
        reviewedById,
        reviewedAt: new Date(),
      },
    });
    await createNotification(
      withdrawal.userId,
      "WITHDRAWAL",
      "Withdrawal paid",
      `Your withdrawal has been sent (${withdrawal.method}).`,
    );
    return result;
  });
}
