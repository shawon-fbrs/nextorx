import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, toJsonError } from "@/lib/api";
import { hashPassword } from "better-auth/crypto";
import { checkPasswordStrength } from "@/lib/password";

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireUser();
    const body = await req.json();
    const { newPassword } = body as { newPassword?: string };

    if (!newPassword || !checkPasswordStrength(newPassword).isValid) {
      return NextResponse.json(
        { error: "Password does not meet requirements" },
        { status: 400 },
      );
    }

    const existing = await prisma.account.findFirst({
      where: { userId: sessionUser.id, providerId: "credential" },
    });
    if (existing?.password) {
      return NextResponse.json(
        { error: "Password already set. Use change password instead." },
        { status: 400 },
      );
    }

    const hash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.account.update({
          where: { id: existing.id },
          data: { password: hash, issuer: "local:credential" },
        });
      } else {
        await tx.account.create({
          data: {
            userId: sessionUser.id,
            accountId: sessionUser.id,
            providerId: "credential",
            issuer: "local:credential",
            password: hash,
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return toJsonError(e);
  }
}
