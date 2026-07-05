import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireHolder } from '@/lib/session';
import { createProjectSchema } from '@/lib/validation';
import { zodError, gateError, rateLimitError } from '@/lib/api';
import { checkRateLimit } from '@/lib/ratelimit';
import { sanitizePlainText } from '@/lib/sanitize';
import { summarizeProjectTrust, sortProjectsByTrust } from '@/lib/trust';
import { resolvePfpImageUrl } from '@/lib/nft';

const SUBMITTER_SELECT = {
  select: { id: true, username: true, walletAddress: true, pfpSerial: true },
} as const;

export async function GET() {
  const projects = await prisma.project.findMany({
    include: {
      submittedBy: SUBMITTER_SELECT,
      vouches: { select: { voucherId: true } },
    },
  });

  const projectsWithPfp = await Promise.all(
    projects.map(async (project) => ({
      ...project,
      submittedBy: {
        ...project.submittedBy,
        pfpImageUrl: await resolvePfpImageUrl(
          project.submittedBy.walletAddress,
          project.submittedBy.pfpSerial
        ),
      },
    }))
  );

  const sorted = sortProjectsByTrust(projectsWithPfp);
  return NextResponse.json({
    projects: sorted.map((p) => ({ ...p, trust: summarizeProjectTrust(p) })),
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireHolder(request);
  if (!gate.ok) return gateError(gate);

  const rl = checkRateLimit(gate.user.walletAddress, 'project');
  if (!rl.allowed) return rateLimitError(rl.retryAfterMs);

  const body = await request.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  const project = await prisma.project.create({
    data: {
      submittedById: gate.user.id,
      name: sanitizePlainText(parsed.data.name, 120),
      xHandle: parsed.data.xHandle ? sanitizePlainText(parsed.data.xHandle, 16) : null,
      website: parsed.data.website ?? null,
      description: sanitizePlainText(parsed.data.description, 2000),
    },
    include: { submittedBy: SUBMITTER_SELECT, vouches: { select: { voucherId: true } } },
  });

  const projectWithPfp = {
    ...project,
    submittedBy: {
      ...project.submittedBy,
      pfpImageUrl: await resolvePfpImageUrl(
        project.submittedBy.walletAddress,
        project.submittedBy.pfpSerial
      ),
    },
  };
  return NextResponse.json(
    { project: { ...projectWithPfp, trust: summarizeProjectTrust(projectWithPfp) } },
    { status: 201 }
  );
}
