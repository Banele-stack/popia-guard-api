import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { unlink, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import type { Readable } from 'stream';
import { FileStorage, StoredFile } from './file-storage';

/**
 * Local-disk implementation of file storage. Works out of the box for local
 * dev and a single-instance deploy with a persistent volume; does NOT
 * survive redeploys on most PaaS platforms with ephemeral filesystems —
 * use S3Storage instead there (see storage.module.ts, auto-selected once
 * S3_BUCKET is set).
 */
@Injectable()
export class LocalDiskStorage extends FileStorage {
  private readonly logger = new Logger('LocalDiskStorage');
  private readonly root: string;

  constructor() {
    super();
    this.root = resolve(process.env.UPLOADS_DIR ?? './uploads');
    if (!existsSync(this.root)) {
      mkdirSync(this.root, { recursive: true });
      this.logger.log(`Created upload storage root at ${this.root}`);
    }
  }

  async save(buffer: Buffer, originalName: string, subDir: string): Promise<StoredFile> {
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
    const relativePath = `${subDir}/${randomUUID()}-${safeName}`;
    const absolutePath = this.absolutePathFor(relativePath);

    mkdirSync(join(this.root, subDir), { recursive: true });
    await writeFile(absolutePath, buffer);

    return { relativePath };
  }

  async delete(relativePath: string): Promise<void> {
    try {
      await unlink(this.absolutePathFor(relativePath));
    } catch (err) {
      this.logger.warn(`Could not delete file ${relativePath}: ${err instanceof Error ? err.message : err}`);
    }
  }

  async getStream(relativePath: string): Promise<Readable> {
    return createReadStream(this.absolutePathFor(relativePath));
  }

  private absolutePathFor(relativePath: string): string {
    const abs = resolve(this.root, relativePath);
    if (!abs.startsWith(this.root)) {
      throw new Error('Resolved path escapes storage root');
    }
    return abs;
  }
}
