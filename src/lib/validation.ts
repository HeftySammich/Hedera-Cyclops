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

export const createWallEventSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    projectName: z.string().trim().min(1).max(120),
    xSpaceUrl: z.string().url(),
    startsAt: z.coerce.date(),
    recurring: z.boolean().default(false),
    dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  })
  .refine((data) => !data.recurring || data.dayOfWeek != null, {
    message: 'Recurring events must specify a dayOfWeek',
    path: ['dayOfWeek'],
  });

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  xHandle: z
    .string()
    .trim()
    .regex(/^@?[A-Za-z0-9_]{1,15}$/)
    .optional()
    .nullable(),
  website: z.string().url().optional().nullable(),
  description: z.string().trim().min(1).max(2000),
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
