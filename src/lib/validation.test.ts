import { describe, expect, it } from 'vitest';
import {
  authNonceSchema,
  createPostSchema,
  createWallEventSchema,
  updateProfileSchema,
} from './validation';

describe('authNonceSchema', () => {
  it('accepts a well-formed Hedera account id', () => {
    expect(authNonceSchema.safeParse({ walletAddress: '0.0.1234' }).success).toBe(true);
  });

  it('rejects a malformed account id', () => {
    expect(authNonceSchema.safeParse({ walletAddress: '0x1234' }).success).toBe(false);
  });
});

describe('createPostSchema', () => {
  it('rejects an empty body', () => {
    expect(createPostSchema.safeParse({ body: '   ' }).success).toBe(false);
  });

  it('defaults imageUrls to an empty array', () => {
    const parsed = createPostSchema.parse({ body: 'hello' });
    expect(parsed.imageUrls).toEqual([]);
  });

  it('rejects more than 4 images', () => {
    const urls = Array.from({ length: 5 }, (_, i) => `https://example.com/${i}.png`);
    expect(createPostSchema.safeParse({ body: 'hi', imageUrls: urls }).success).toBe(false);
  });
});

describe('updateProfileSchema', () => {
  it('rejects usernames with disallowed characters', () => {
    expect(updateProfileSchema.safeParse({ username: 'bad name!' }).success).toBe(false);
  });

  it('accepts a valid username', () => {
    expect(updateProfileSchema.safeParse({ username: 'anon_1234' }).success).toBe(true);
  });

  it('accepts clearing pfpSerial to null', () => {
    expect(updateProfileSchema.safeParse({ pfpSerial: null }).success).toBe(true);
  });
});

describe('createWallEventSchema', () => {
  const base = {
    title: 'Weekly Alpha',
    projectName: 'Cyclops',
    xSpaceUrl: 'https://x.com/i/spaces/1',
    startsAt: new Date().toISOString(),
  };

  it('requires recurrenceFrequency when recurring is true', () => {
    const result = createWallEventSchema.safeParse({ ...base, recurring: true, dayOfWeek: 2 });
    expect(result.success).toBe(false);
  });

  it('accepts a weekly recurring event with a dayOfWeek', () => {
    const result = createWallEventSchema.safeParse({
      ...base,
      recurring: true,
      recurrenceFrequency: 'weekly',
      dayOfWeek: 2,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a monthly recurring event without dayOfWeek', () => {
    const result = createWallEventSchema.safeParse({
      ...base,
      recurring: true,
      recurrenceFrequency: 'monthly',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a one-off event without dayOfWeek', () => {
    const result = createWallEventSchema.safeParse(base);
    expect(result.success).toBe(true);
  });
});
