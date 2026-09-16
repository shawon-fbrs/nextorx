"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/api";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/services/audit";
import { getSettings, SETTING_DEFAULTS } from "@/lib/settings";
import { verifyDeposit, rejectDeposit } from "@/lib/services/deposits";
import { approveWithdrawal, rejectWithdrawal } from "@/lib/services/withdrawals";
import { credit, debit } from "@/lib/ledger";

const updatePairPayoutSchema = z.object({
  pairId: z.string().min(1),
  payout: z.number().min(50).max(95),
});

export async function updatePairPayout(pairId: string, payout: number) {
  try {
    const admin = await requirePermission("pair", "update");
    const parsed = updatePairPayoutSchema.safeParse({ pairId, payout });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const pair = await prisma.pair.update({
      where: { id: pairId },
      data: { payoutPercent: payout },
    });

    await logAudit(admin.id, "pair.update-payout", "Pair", pairId, { payoutPercent: payout });
    revalidatePath("/console-panel/otc");
    revalidatePath("/console-panel/settings");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update payout" };
  }
}

const updatePairStatusSchema = z.object({
  pairId: z.string().min(1),
  isActive: z.boolean(),
});

export async function updatePairStatus(pairId: string, isActive: boolean) {
  try {
    const admin = await requirePermission("pair", "update");
    const parsed = updatePairStatusSchema.safeParse({ pairId, isActive });
    if (!parsed.success) {
      return { error: "Invalid input" };
    }

    const pair = await prisma.pair.update({
      where: { id: pairId },
      data: { isActive },
    });

    try {
      const { getOTCEngine } = await import("@/lib/otc-engine");
      const engine = await getOTCEngine();
      if (isActive) {
        await engine.addPair(pairId);
      } else {
        await engine.removePair(pairId);
      }
    } catch (e) {
      console.error(`[Admin] engine sync failed for ${pairId}:`, e instanceof Error ? e.message : e);
    }

    await logAudit(admin.id, "pair.toggle", "Pair", pairId, { isActive });
    revalidatePath("/console-panel/otc");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update pair status" };
  }
}

const updatePlatformSettingsSchema = z.object({
  values: z.record(z.string(), z.number().int().min(0)),
});

export async function updatePlatformSettings(values: Record<string, number>) {
  try {
    const admin = await requirePermission("settings", "manage");
    const parsed = updatePlatformSettingsSchema.safeParse({ values });
    if (!parsed.success) {
      return { error: "Invalid input" };
    }

    const before = await getSettings();
    for (const [key, value] of Object.entries(parsed.data.values)) {
      await prisma.platformSetting.upsert({
        where: { key },
        create: { key, value, label: SETTING_DEFAULTS[key]?.label },
        update: { value },
      });
    }
    await logAudit(admin.id, "settings.update", "PlatformSetting", "levers", {
      before,
      after: await getSettings(),
    });

    revalidatePath("/console-panel/settings");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save settings" };
  }
}

export async function approveDeposit(depositId: string) {
  try {
    const admin = await requirePermission("deposit", "verify");
    const d = await verifyDeposit(depositId, admin.id);
    await logAudit(admin.id, "deposit.verify", "DepositRequest", depositId);
    revalidatePath("/console-panel/finance");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to approve deposit" };
  }
}

export async function rejectDepositAction(depositId: string, reason?: string) {
  try {
    const admin = await requirePermission("deposit", "verify");
    const d = await rejectDeposit(depositId, admin.id, reason);
    await logAudit(admin.id, "deposit.reject", "DepositRequest", depositId, { note: reason });
    revalidatePath("/console-panel/finance");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to reject deposit" };
  }
}

export async function approveWithdrawalAction(withdrawalId: string, note?: string) {
  try {
    const admin = await requirePermission("withdrawal", "approve");
    const w = await approveWithdrawal(withdrawalId, admin.id, note);
    await logAudit(admin.id, "withdrawal.approve", "WithdrawalRequest", withdrawalId, { note });
    revalidatePath("/console-panel/finance");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to approve withdrawal" };
  }
}

export async function rejectWithdrawalAction(withdrawalId: string, reason?: string) {
  try {
    const admin = await requirePermission("withdrawal", "reject");
    const w = await rejectWithdrawal(withdrawalId, admin.id, reason);
    await logAudit(admin.id, "withdrawal.reject", "WithdrawalRequest", withdrawalId, { note: reason });
    revalidatePath("/console-panel/finance");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to reject withdrawal" };
  }
}

export async function banUser(userId: string, reason: string) {
  try {
    const admin = await requirePermission("user", "update");
    await prisma.user.update({
      where: { id: userId },
      data: { banned: true, banReason: reason },
    });
    await logAudit(admin.id, "user.ban", "User", userId, { reason });
    revalidatePath(`/console-panel/users/${userId}`);
    revalidatePath("/console-panel/users");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to ban user" };
  }
}

export async function unbanUser(userId: string) {
  try {
    const admin = await requirePermission("user", "update");
    await prisma.user.update({
      where: { id: userId },
      data: { banned: false, banReason: null, banExpires: null },
    });
    await logAudit(admin.id, "user.unban", "User", userId);
    revalidatePath(`/console-panel/users/${userId}`);
    revalidatePath("/console-panel/users");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to unban user" };
  }
}

export async function setUserRole(userId: string, role: string) {
  try {
    const admin = await requirePermission("user", "update");
    if (admin.role !== "super_admin") {
      return { error: "Only super_admin can change roles" };
    }
    if (userId === admin.id) {
      return { error: "Cannot change your own role" };
    }
    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });
    await logAudit(admin.id, "user.set-role", "User", userId, { role });
    revalidatePath(`/console-panel/users/${userId}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to set role" };
  }
}

export async function reset2FA(userId: string, note: string) {
  try {
    const admin = await requirePermission("user", "update");
    await prisma.$transaction(async (tx) => {
      await tx.twoFactor.deleteMany({ where: { userId } });
      await tx.user.update({ where: { id: userId }, data: { twoFactorEnabled: false } });
    });
    await logAudit(admin.id, "user.2fa-reset", "User", userId, { note });
    revalidatePath(`/console-panel/users/${userId}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to reset 2FA" };
  }
}

export async function adjustBalance(userId: string, amountUsd: number, note: string) {
  try {
    const admin = await requirePermission("user", "update");
    const amount = Math.round(Math.abs(amountUsd) * 100);
    const isCredit = amountUsd >= 0;
    if (isCredit) {
      await credit({
        userId,
        type: "ADMIN_ADJUSTMENT",
        amount,
        referenceId: `admin-${admin.id}-${Date.now()}`,
        description: note,
      });
    } else {
      await debit({
        userId,
        type: "ADMIN_ADJUSTMENT",
        amount,
        referenceId: `admin-${admin.id}-${Date.now()}`,
        description: note,
      });
    }
    await logAudit(admin.id, "user.adjust-balance", "User", userId, { amountUsd, note });
    revalidatePath(`/console-panel/users/${userId}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to adjust balance" };
  }
}

export async function togglePromoActive(promoId: string, active: boolean) {
  try {
    const admin = await requirePermission("promo", "manage");
    await prisma.promoCode.update({
      where: { id: promoId },
      data: { active },
    });
    await logAudit(admin.id, "promo.toggle", "PromoCode", promoId, { active });
    revalidatePath("/console-panel/promos");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to toggle promo" };
  }
}

export async function createPromo(data: {
  code: string;
  label?: string | null;
  percent: number;
  maxBonus: number;
  minDeposit: number;
  maxUses: number;
  usesPerUser: number;
  validUntil?: string | null;
}) {
  try {
    const admin = await requirePermission("promo", "manage");
    const promo = await prisma.promoCode.create({
      data: {
        code: data.code.toUpperCase(),
        label: data.label,
        percent: data.percent,
        maxBonus: data.maxBonus,
        minDeposit: data.minDeposit,
        maxUses: data.maxUses,
        usesPerUser: data.usesPerUser,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
      },
    });
    await logAudit(admin.id, "promo.create", "PromoCode", promo.id, {
      code: promo.code,
      percent: promo.percent,
    });
    revalidatePath("/console-panel/promos");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create promo" };
  }
}

export async function reviewKyc(submissionId: string, action: "approve" | "reject", note?: string) {
  try {
    const admin = await requirePermission("kyc", action === "approve" ? "approve" : "reject");
    const submission = await prisma.kycSubmission.findUnique({ where: { id: submissionId } });
    if (!submission) return { error: "Submission not found" };

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

    await prisma.$transaction(async (tx) => {
      await tx.kycSubmission.update({
        where: { id: submissionId },
        data: { status: newStatus, note },
      });
      if (action === "approve") {
        await tx.user.update({
          where: { id: submission.userId },
          data: { kycStatus: "TIER_1" },
        });
      }
    });

    await logAudit(admin.id, `kyc.${action}`, "KycSubmission", submissionId, { note });
    revalidatePath("/console-panel/kyc");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to review KYC" };
  }
}

export async function markNotificationRead(userId: string, ids?: string[]) {
  try {
    if (ids && ids.length > 0) {
      await prisma.notification.updateMany({
        where: { userId, id: { in: ids } },
        data: { readAt: new Date() },
      });
    }
    revalidatePath("/notifications");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to mark read" };
  }
}

export async function markAllNotificationsRead(userId: string) {
  try {
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath("/notifications");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to mark all read" };
  }
}
