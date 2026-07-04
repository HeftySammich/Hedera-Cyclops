import { NextRequest, NextResponse } from 'next/server';
import { requireHolder } from '@/lib/session';
import { gateError, jsonError, rateLimitError } from '@/lib/api';
import { checkRateLimit } from '@/lib/ratelimit';
import { validateUpload, uploadObject } from '@/lib/s3';

export async function POST(request: NextRequest) {
  const gate = await requireHolder(request);
  if (!gate.ok) return gateError(gate);

  const rl = checkRateLimit(gate.user.walletAddress, 'upload');
  if (!rl.allowed) return rateLimitError(rl.retryAfterMs);

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || !(file instanceof File)) {
    return jsonError('No file provided.', 400);
  }

  const validationError = validateUpload(file.type, file.size);
  if (validationError) return jsonError(validationError.error, 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadObject(buffer, file.type, 'town-hall');

  return NextResponse.json({ url }, { status: 201 });
}
