import type { Readable } from 'stream';

export interface StoredFile {
  /** What gets persisted on the entity — a key/relative-path, never a full
   * URL, so it means the same thing regardless of which backend wrote it. */
  relativePath: string;
}

/**
 * Common shape for anything that can persist an uploaded compliance file
 * (operator agreements, policy documents). An abstract class rather than a
 * plain interface so it can double as a NestJS DI token (see
 * storage.module.ts) — a `type`/`interface` is erased at compile time and
 * can't be injected.
 *
 * Two implementations exist: LocalDiskStorage (the default — works with zero
 * configuration, but doesn't survive a redeploy on a host with an ephemeral
 * filesystem) and S3Storage (auto-selected instead the moment S3_BUCKET is
 * set — see storage.module.ts).
 */
export abstract class FileStorage {
  abstract save(buffer: Buffer, originalName: string, subDir: string): Promise<StoredFile>;
  abstract delete(relativePath: string): Promise<void>;
  abstract getStream(relativePath: string): Promise<Readable>;
}
