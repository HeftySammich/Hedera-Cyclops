import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireHolder } from '@/lib/session';
import { createWallEventSchema } from '@/lib/validation';
import { zodError, gateError, rateLimitError } from '@/lib/api';
import { checkRateLimit } from '@/lib/ratelimit';
import { sanitizePlainText } from '@/lib/sanitize';
import { resolvePfpImageUrl } from '@/lib/nft';

const OWNER_SELECT = {
  select: { id: true, username: true, walletAddress: true, pfpSerial: true },
} as const;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const events = await prisma.wallEvent.findMany({
    where: {
      ...(from || to
        ? {
            startsAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { startsAt: 'asc' },
    include: { owner: OWNER_SELECT },
  });

  const eventsWithPfp = await Promise.all(
    events.map(async (event) => ({
      ...event,
      owner: {
        ...event.owner,
        pfpImageUrl: await resolvePfpImageUrl(event.owner.walletAddress, event.owner.pfpSerial),
      },
    }))
  );

  return NextResponse.json({ events: eventsWithPfp });
}

export async function POST(request: NextRequest) {
  const gate = await requireHolder(request);
  if (!gate.ok) return gateError(gate);

  const rl = checkRateLimit(gate.user.walletAddress, 'wallEvent');
  if (!rl.allowed) return rateLimitError(rl.retryAfterMs);

  const body = await request.json().catch(() => null);
  const parsed = createWallEventSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  const event = await prisma.wallEvent.create({
    data: {
      ownerId: gate.user.id,
      title: sanitizePlainText(parsed.data.title, 120),
      projectName: sanitizePlainText(parsed.data.projectName, 120),
      xSpaceUrl: parsed.data.xSpaceUrl,
      startsAt: parsed.data.startsAt,
      recurring: parsed.data.recurring,
      recurrenceFrequency: parsed.data.recurrenceFrequency ?? null,
      dayOfWeek: parsed.data.dayOfWeek ?? null,
    },
    include: { owner: OWNER_SELECT },
  });

  const eventWithPfp = {
    ...event,
    owner: {
      ...event.owner,
      pfpImageUrl: await resolvePfpImageUrl(event.owner.walletAddress, event.owner.pfpSerial),
    },
  };
  return NextResponse.json({ event: eventWithPfp }, { status: 201 });
}
