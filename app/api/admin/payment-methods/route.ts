import { NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission, toJsonError } from "@/lib/api";
import { logAudit } from "@/lib/services/audit";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(1).max(20),
  label: z.string().min(1).max(50),
  sortOrder: z.number().int().min(0).max(100).optional(),
  logoUrl: z.string().max(500).optional(),
  networkName: z.string().max(50).optional(),
  networkLogoUrl: z.string().max(500).optional(),
  region: z.string().optional(),
  minDeposit: z.number().int().min(0).optional(),
  maxDeposit: z.number().int().min(0).optional(),
  minWithdraw: z.number().int().min(0).optional(),
  maxWithdraw: z.number().int().min(0).optional(),
  accountAddress: z.string().max(200).optional(),
  accountQrUrl: z.string().max(500).optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(50).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(100).optional(),
  logoUrl: z.string().max(500).optional(),
  networkName: z.string().max(50).optional(),
  networkLogoUrl: z.string().max(500).optional(),
  region: z.string().optional(),
  minDeposit: z.number().int().min(0).optional(),
  maxDeposit: z.number().int().min(0).optional(),
  minWithdraw: z.number().int().min(0).optional(),
  maxWithdraw: z.number().int().min(0).optional(),
  accountAddress: z.string().max(200).optional(),
  accountQrUrl: z.string().max(500).optional(),
});

const deleteSchema = z.object({ id: z.string().min(1) });

const cleanOrNull = (v: string | undefined) => (v?.trim() ? v.trim() : null);

export async function GET() {
  try {
    await requirePermission("payment", "list");
    const methods = await prisma.paymentMethod.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return Response.json({ methods });
  } catch (e) {
    return toJsonError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requirePermission("payment", "manage");
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    const name = parsed.data.name.toUpperCase();
    const networkName = parsed.data.networkName?.trim() ?? "";
    const existing = await prisma.paymentMethod.findFirst({
      where: { name, networkName },
    });
    if (existing) {
      return Response.json(
        { error: `Method "${name}"${networkName ? ` (${networkName})` : ""} already exists` },
        { status: 409 },
      );
    }
    const { logoUrl, networkLogoUrl, accountAddress, accountQrUrl, ...rest } = parsed.data;
    const method = await prisma.paymentMethod.create({
      data: {
        ...rest,
        name,
        networkName,
        logoUrl: cleanOrNull(logoUrl),
        networkLogoUrl: cleanOrNull(networkLogoUrl),
        accountAddress: cleanOrNull(accountAddress),
        accountQrUrl: cleanOrNull(accountQrUrl),
      },
    });
    await logAudit(admin.id, "payment.method_create", "PaymentMethod", method.id, {
      name: method.name,
      label: method.label,
      networkName,
      region: method.region,
    });
    return Response.json({ method }, { status: 201 });
  } catch (e) {
    return toJsonError(e);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requirePermission("payment", "manage");
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    const { id, logoUrl, networkName, networkLogoUrl, accountAddress, accountQrUrl, ...rest } = parsed.data;
    const data = {
      ...rest,
      ...(logoUrl !== undefined ? { logoUrl: cleanOrNull(logoUrl) } : {}),
      ...(networkName !== undefined ? { networkName: networkName.trim() } : {}),
      ...(networkLogoUrl !== undefined ? { networkLogoUrl: cleanOrNull(networkLogoUrl) } : {}),
      ...(accountAddress !== undefined ? { accountAddress: cleanOrNull(accountAddress) } : {}),
      ...(accountQrUrl !== undefined ? { accountQrUrl: cleanOrNull(accountQrUrl) } : {}),
    };
    const method = await prisma.paymentMethod.update({ where: { id }, data });
    await logAudit(admin.id, "payment.method_update", "PaymentMethod", id, data);
    return Response.json({ method });
  } catch (e) {
    return toJsonError(e);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requirePermission("payment", "manage");
    const parsed = deleteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    await prisma.paymentMethod.delete({ where: { id: parsed.data.id } });
    await logAudit(admin.id, "payment.method_delete", "PaymentMethod", parsed.data.id);
    return Response.json({ ok: true });
  } catch (e) {
    return toJsonError(e);
  }
}
