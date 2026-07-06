import { z } from 'zod';

// Zod schemas for every API request body. Keeping these centralized makes it
// easy to see the full surface of user-controlled input in one place.

const hederaAccountId = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, 'Must be a Hedera account id, e.g. 0.0.1234');

export const authNonceSchema = z.object({
  walletAddress: hederaAccountId,
});

export const authVerifySchema = z.object({
  walletAddress: hederaAccountId,
  nonce: z.string().min(1).max(64),
  signature: z.string().min(1),
});

export const createPostSchema = z.object({
  body: z.string().trim().min(1, 'Post cannot be empty').max(4000),
  parentId: z.string().cuid().nullable().optional(),
  imageUrls: z.array(z.string().url()).max(4).optional().default([]),
});

export const likePostSchema = z.object({
  postId: z.string().cuid(),
});

export const updateProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(24, 'Username must be at most 24 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, and underscores only')
    .optional()
    .nullable(),
  pfpSerial: z.number().int().positive().nullable().optional(),
});

const RECURRENCE_FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'weekdays'] as const;

export const createWallEventSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    projectName: z.string().trim().min(1).max(120),
    xAccount: z
      .string()
      .trim()
      .min(1)
      .max(16)
      .regex(/^@?[A-Za-z0-9_]{1,15}$/, 'Must be a valid X handle, e.g. @cyclops'),
    startsAt: z.coerce.date(),
    recurring: z.boolean().default(false),
    recurrenceFrequency: z.enum(['', ...RECURRENCE_FREQUENCIES]).optional(),
    dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  })
  .transform((data) => {
    // Treat empty-string frequency as non-recurring for form convenience.
    const frequency = data.recurrenceFrequency || null;
    return { ...data, recurrenceFrequency: frequency };
  })
  .refine(
    (data) =>
      !data.recurring ||
      RECURRENCE_FREQUENCIES.includes(data.recurrenceFrequency as any),
    {
      message: 'Recurring events must select a frequency',
      path: ['recurrenceFrequency'],
    }
  )
  .refine(
    (data) =>
      !data.recurring ||
      data.recurrenceFrequency === 'monthly' ||
      data.recurrenceFrequency === 'weekdays' ||
      data.dayOfWeek != null,
    {
      message: 'Weekly/bi-weekly events must specify a dayOfWeek',
      path: ['dayOfWeek'],
    }
  );

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required.').max(120, 'Project name is too long.'),
  xHandle: z.preprocess(
    (val) => {
      if (val == null || val === '') return null;
      const cleaned = String(val).trim().replace(/^@/, '');
      return cleaned === '' ? null : cleaned;
    },
    z
      .string()
      .regex(/^[A-Za-z0-9_]{1,15}$/, 'X handle must be 1-15 letters, numbers, or underscores.')
      .optional()
      .nullable()
  ),
  website: z.preprocess(
    (val) => {
      if (val == null || val === '') return null;
      let url = String(val).trim();
      if (!url) return null;
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      return url;
    },
    z.string().url('Website must be a valid URL.').optional().nullable()
  ),
  description: z.string().trim().min(1, 'Description is required.').max(2000, 'Description is too long.'),
});

export const createVouchSchema = z.object({
  projectId: z.string().cuid(),
  comment: z.string().trim().max(500).optional().nullable(),
});

export const nftFilterSchema = z.object({
  traits: z.record(z.string(), z.array(z.string())).optional(),
  search: z.string().max(64).optional(),
});

export const uploadRequestSchema = z.object({
  mimeType: z.string(),
  byteLength: z.number().int().positive(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateWallEventInput = z.infer<typeof createWallEventSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateVouchInput = z.infer<typeof createVouchSchema>;
