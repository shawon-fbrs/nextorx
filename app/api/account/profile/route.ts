import { requireUser, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const sessionUser = await requireUser();
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        uid: true,
        name: true,
        email: true,
        image: true,
        role: true,
        balance: true,
        bonusBalance: true,
        nickname: true,
        firstName: true,
        lastName: true,
        country: true,
        phone: true,
        kycStatus: true,
        referralCode: true,
        currencyPref: true,
        createdAt: true,
      },
    });
    if (!user) return Response.json({ error: "User not found" }, { status: 404 });
    return Response.json({ user });
  } catch (e) {
    return toJsonError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    const sessionUser = await requireUser();
    const body = (await request.json().catch(() => ({}))) as {
      nickname?: string;
      firstName?: string;
      lastName?: string;
      country?: string;
      phone?: string;
      currencyPref?: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { kycStatus: true },
    });
    if (!user) throw new Error("User not found");

    const verified = user.kycStatus === "TIER_1";
    if (verified) {
      for (const field of ["firstName", "lastName", "country"] as const) {
        if (body[field] !== undefined) {
          return Response.json(
            { error: `Identity details are locked after verification` },
            { status: 403 },
          );
        }
      }
    }

    const data: Record<string, unknown> = {};
    if (typeof body.nickname === "string") {
      const nickname = body.nickname.trim();
      if (!nickname) return Response.json({ error: "Nickname cannot be empty" }, { status: 400 });
      data.nickname = nickname;
    }
    if (!verified) {
      if (typeof body.firstName === "string") data.firstName = body.firstName.trim() || null;
      if (typeof body.lastName === "string") data.lastName = body.lastName.trim() || null;
      if (typeof body.country === "string") data.country = body.country.trim() || null;
    }
    if (typeof body.phone === "string") data.phone = body.phone.trim() || null;
    if (typeof body.currencyPref === "string") {
      const pref = body.currencyPref.toUpperCase();
      if (!["USD", "EUR", "GBP", "BTC"].includes(pref)) {
        return Response.json({ error: "Invalid currency preference" }, { status: 400 });
      }
      data.currencyPref = pref;
    }

    const updated = await prisma.user.update({
      where: { id: sessionUser.id },
      data,
      select: {
        nickname: true,
        firstName: true,
        lastName: true,
        country: true,
        phone: true,
        kycStatus: true,
        currencyPref: true,
      },
    });
    return Response.json({ user: updated });
  } catch (e) {
    return toJsonError(e);
  }
}
