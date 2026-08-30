import { requireUser, toJsonError } from "@/lib/api";

export async function GET() {
  try {
    await requireUser();
    return Response.json({ submissions: [] });
  } catch (e) {
    return toJsonError(e);
  }
}

export async function POST() {
  try {
    await requireUser();
    return Response.json({ error: "KYC not yet implemented" }, { status: 501 });
  } catch (e) {
    return toJsonError(e);
  }
}
