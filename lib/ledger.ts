import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { LedgerType } from "@prisma/client";

type LedgerTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export class LedgerError extends Error {
  constructor(
    message: string,
    public code:
      | "INSUFFICIENT_BALANCE"
      | "ALREADY_PROCESSED"
      | "NOT_FOUND"
      | "INVALID",
  ) {
    super(message);
  }
}

export type Wallet = "real" | "demo";

export interface LedgerInput {
  userId: string;
  type: LedgerType;
  amount: number;
  debit?: boolean;
  wallet?: Wallet;
  bonusAmount?: number;
  allowNegative?: boolean;
  referenceId?: string;
  description?: string;
  reversalOfId?: string;
}

export function computeChecksum(
  previousChecksum: string | null,
  type: string,
  signedAmount: number,
  balanceAfter: number,
): string {
  return createHash("sha256")
    .update(`${previousChecksum ?? "genesis"}|${type}|${signedAmount}|${balanceAfter}`)
    .digest("hex");
}

async function postEntry(tx: LedgerTx, input: LedgerInput) {
  const wallet: Wallet = input.wallet ?? "real";
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.userId + ":" + wallet}))`;

  const signed = input.debit ? -Math.abs(input.amount) : Math.abs(input.amount);
  const bonusSigned = input.bonusAmount ?? 0;

  const user = await tx.user.findUnique({
    where: { id: input.userId },
    select: { balance: true, demoBalance: true, bonusBalance: true },
  });
  if (!user) throw new LedgerError("User not found", "NOT_FOUND");

  const currentWallet = wallet === "demo" ? user.demoBalance : user.balance;
  const newBalance = currentWallet + signed;
  if (newBalance < 0 && !input.allowNegative) {
    throw new LedgerError("Insufficient balance", "INSUFFICIENT_BALANCE");
  }
  const newBonusBalance = (user.bonusBalance ?? 0) + bonusSigned;
  if (newBonusBalance < 0) {
    throw new LedgerError("Insufficient bonus balance", "INSUFFICIENT_BALANCE");
  }

  const previous = await tx.ledgerEntry.findFirst({
    where: { userId: input.userId, wallet, checksum: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { checksum: true },
  });
  const checksum = computeChecksum(previous?.checksum ?? null, input.type, signed, newBalance);

  try {
    const [entry] = await Promise.all([
      tx.ledgerEntry.create({
        data: {
          userId: input.userId,
          type: input.type,
          amount: signed,
          wallet,
          balanceAfter: newBalance,
          bonusBalanceAfter: newBonusBalance,
          referenceId: input.referenceId,
          description: input.description,
          checksum,
          reversalOfId: input.reversalOfId,
        },
      }),
      tx.user.update({
        where: { id: input.userId },
        data: wallet === "demo"
          ? { demoBalance: newBalance, bonusBalance: newBonusBalance }
          : { balance: newBalance, bonusBalance: newBonusBalance },
      }),
    ]);
    return entry;
  } catch (e: unknown) {
    if (
      e instanceof Error &&
      "code" in e &&
      e.code === "P2002"
    ) {
      throw new LedgerError(
        "Entry already processed",
        "ALREADY_PROCESSED",
      );
    }
    throw e;
  }
}

export async function credit(
  input: Omit<LedgerInput, "debit">,
): Promise<{ entryId: string; balanceAfter: number }> {
  return prisma.$transaction(async (tx) => {
    const entry = await postEntry(tx, { ...input, debit: false });
    return { entryId: entry.id, balanceAfter: entry.balanceAfter };
  });
}

export async function postEntryInTx(tx: LedgerTx, input: LedgerInput) {
  return postEntry(tx, input);
}

export async function debit(
  input: Omit<LedgerInput, "debit">,
): Promise<{ entryId: string; balanceAfter: number }> {
  return prisma.$transaction(async (tx) => {
    const entry = await postEntry(tx, { ...input, debit: true });
    return { entryId: entry.id, balanceAfter: entry.balanceAfter };
  });
}

export async function runLedgerBatch(
  entries: LedgerInput[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const input of entries) {
      await postEntry(tx, input);
    }
  });
}

export async function recomputeBalance(userId: string, wallet: Wallet = "real"): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const agg = await tx.ledgerEntry.aggregate({
      where: { userId, wallet },
      _sum: { amount: true },
    });
    const balance = agg._sum.amount ?? 0;
    await tx.user.update({
      where: { id: userId },
      data: wallet === "demo" ? { demoBalance: balance } : { balance },
    });
    return balance;
  });
}

export async function getLedgerHistory(
  userId: string,
  limit = 100,
  wallet?: Wallet,
) {
  return prisma.ledgerEntry.findMany({
    where: { userId, ...(wallet ? { wallet } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function reverseEntry(input: {
  userId: string;
  entryId: string;
  type: LedgerType;
  reason: string;
}): Promise<{ entryId: string; balanceAfter: number }> {
  const original = await prisma.ledgerEntry.findFirst({
    where: { id: input.entryId, userId: input.userId },
  });
  if (!original) throw new LedgerError("Original entry not found", "NOT_FOUND");
  if (original.amount === 0) throw new LedgerError("Nothing to reverse", "INVALID");

  const reversal: Omit<LedgerInput, "debit"> = {
    userId: input.userId,
    type: input.type,
    amount: Math.abs(original.amount),
    wallet: (original.wallet as Wallet) ?? "real",
    referenceId: `reversal:${original.id}`,
    description: `Reversal of ${original.id}: ${input.reason}`,
    reversalOfId: original.id,
  };
  return original.amount > 0 ? debit(reversal) : credit(reversal);
}

export interface IntegrityResult {
  ok: boolean;
  checked: number;
  legacy: number;
  failedId?: string;
}

export async function verifyLedgerIntegrity(userId: string, wallet?: Wallet): Promise<IntegrityResult> {
  const entries = await prisma.ledgerEntry.findMany({
    where: { userId, ...(wallet ? { wallet } : {}) },
    orderBy: { createdAt: "asc" },
  });
  let previousChecksum: string | null = null;
  let checked = 0;
  let legacy = 0;
  for (const entry of entries) {
    if (!entry.checksum) {
      legacy++;
      continue;
    }
    const expected = computeChecksum(previousChecksum, entry.type, entry.amount, entry.balanceAfter);
    if (entry.checksum !== expected) {
      return { ok: false, checked, legacy, failedId: entry.id };
    }
    previousChecksum = entry.checksum;
    checked++;
  }
  return { ok: true, checked, legacy };
}
