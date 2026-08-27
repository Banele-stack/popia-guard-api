import { createHash, randomBytes } from 'crypto';

/**
 * The one-time-token pattern used everywhere a link is emailed out that
 * proves possession of an inbox (forgot-password, team invites): only a
 * hash of the token is ever persisted, mirroring how passwordHash works —
 * a leaked DB row alone shouldn't be enough to act as the user, only the
 * raw value that actually went out in the email.
 */
export interface HashedToken {
  /** The value emailed to the user — never stored. */
  rawToken: string;
  /** What actually gets persisted on the entity. */
  tokenHash: string;
  expiresAt: Date;
}

export function generateHashedToken(ttlMs: number): HashedToken {
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash, expiresAt: new Date(Date.now() + ttlMs) };
}

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
