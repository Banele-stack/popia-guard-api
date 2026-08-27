import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Readable } from 'stream';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { FileStorage, StoredFile } from './file-storage';

/**
 * S3-compatible object storage — works with real AWS S3, Cloudflare R2,
 * Backblaze B2, DigitalOcean Spaces, MinIO, or anything else speaking the
 * S3 API. Auto-selected instead of LocalDiskStorage the moment S3_BUCKET is
 * set (see storage.module.ts) — survives redeploys on an ephemeral
 * filesystem, unlike local disk.
 */
@Injectable()
export class S3Storage extends FileStorage {
  private readonly logger = new Logger('S3Storage');
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    super();
    this.bucket = process.env.S3_BUCKET as string;
    this.client = new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      credentials:
        process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.S3_ACCESS_KEY_ID,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
    this.logger.log(`Using S3-compatible object storage (bucket: ${this.bucket})`);
  }

  async save(buffer: Buffer, originalName: string, subDir: string): Promise<StoredFile> {
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
    const relativePath = `${subDir}/${randomUUID()}-${safeName}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: relativePath,
        Body: buffer,
      }),
    );

    return { relativePath };
  }

  async delete(relativePath: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: relativePath }));
    } catch (err) {
      this.logger.warn(`Could not delete object ${relativePath}: ${err instanceof Error ? err.message : err}`);
    }
  }

  async getStream(relativePath: string): Promise<Readable> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: relativePath }),
    );
    return result.Body as Readable;
  }
}
