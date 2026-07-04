import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import { env } from './env';

// Generic S3-compatible client — works identically against Cloudflare R2,
// AWS S3, or MinIO. Never hardcode a vendor-specific SDK quirk here.
function getClient(): S3Client {
  return new S3Client({
    region: env.objectStorage.region,
    endpoint: env.objectStorage.endpoint || undefined,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.objectStorage.accessKeyId,
      secretAccessKey: env.objectStorage.secretAccessKey,
    },
  });
}

export const ALLOWED_UPLOAD_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB

export interface UploadValidationError {
  error: string;
}

export function validateUpload(
  mimeType: string,
  byteLength: number
): UploadValidationError | null {
  if (!ALLOWED_UPLOAD_MIME_TYPES.includes(mimeType)) {
    return { error: `Unsupported file type: ${mimeType}` };
  }
  if (byteLength > MAX_UPLOAD_BYTES) {
    return { error: `File too large (max ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB)` };
  }
  return null;
}

function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    default:
      return 'bin';
  }
}

/** Upload a validated buffer and return its public URL. */
export async function uploadObject(
  buffer: Buffer,
  mimeType: string,
  prefix = 'town-hall'
): Promise<string> {
  const key = `${prefix}/${crypto.randomUUID()}.${extensionFor(mimeType)}`;
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: env.objectStorage.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );
  const base = env.objectStorage.publicUrl || env.objectStorage.endpoint;
  return `${base.replace(/\/$/, '')}/${key}`;
}
