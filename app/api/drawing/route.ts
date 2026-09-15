import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, toJsonError } from '@/lib/api';
import { z } from 'zod';

const saveSchema = z.object({
  pairId: z.string().min(1),
  timeframe: z.string().min(1),
  drawings: z.array(z.object({
    name: z.string(),
    points: z.any().optional(),
    styles: z.any().optional(),
    lock: z.boolean().optional(),
    visible: z.boolean().optional(),
  })),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const pairId = searchParams.get('pairId');
    const timeframe = searchParams.get('timeframe');
    if (!pairId || !timeframe) {
      return Response.json({ error: 'pairId and timeframe required' }, { status: 400 });
    }
    const row = await prisma.drawing.findUnique({
      where: { userId_pairId_timeframe: { userId: user.id, pairId, timeframe } },
    });
    return Response.json({ drawings: row?.drawings ?? [] });
  } catch (e) {
    return toJsonError(e);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = saveSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: 'Invalid input' }, { status: 400 });
    }
    const { pairId, timeframe, drawings } = parsed.data;
    await prisma.drawing.upsert({
      where: { userId_pairId_timeframe: { userId: user.id, pairId, timeframe } },
      create: { userId: user.id, pairId, timeframe, drawings },
      update: { drawings },
    });
    return Response.json({ ok: true });
  } catch (e) {
    return toJsonError(e);
  }
}
