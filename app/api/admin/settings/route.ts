import { NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission, toJsonError } from "@/lib/api";
import { logAudit } from "@/lib/services/audit";
import { getSettings, SETTING_DEFAULTS } from "@/lib/settings";
import { prisma } from "@/lib/db";

const updateSchema = z
  .object({
    values: z.record(z.string(), z.number().int().min(0)),
  })
  .refine((d) => Object.keys(d.values).length > 0, {
    message: "At least one setting required",
  });

export async function GET() {
  try {
    await requirePermission("settings", "read");
    const settings = await getSettings();
    const rows = Object.keys(SETTING_DEFAULTS).map((key) => ({
      key,
      label: SETTING_DEFAULTS[key].label,
      value: settings[key] ?? SETTING_DEFAULTS[key].value,
    }));
    return Response.json({ settings: rows });
  } catch (e) {
    return toJsonError(e);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requirePermission("settings", "manage");
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
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
    return Response.json({ ok: true });
  } catch (e) {
    return toJsonError(e);
  }
}
