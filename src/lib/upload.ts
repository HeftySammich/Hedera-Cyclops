// Upload constraints shared between the client UI and the server-side S3
// validation. Keeping these here avoids pulling the AWS SDK into the browser
// bundle just for constant values.

export const ALLOWED_UPLOAD_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB
