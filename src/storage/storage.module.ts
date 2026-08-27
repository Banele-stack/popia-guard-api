import { Global, Module } from '@nestjs/common';
import { FileStorage } from './file-storage';
import { LocalDiskStorage } from './local-disk.storage';
import { S3Storage } from './s3.storage';

/**
 * Same pattern EmailService uses for SMTP: local/no-config by default, real
 * provider the moment its config env var is set — S3_BUCKET here.
 */
function usesS3Storage(): boolean {
  return Boolean(process.env.S3_BUCKET);
}

@Global()
@Module({
  providers: [
    {
      provide: FileStorage,
      useClass: usesS3Storage() ? S3Storage : LocalDiskStorage,
    },
  ],
  exports: [FileStorage],
})
export class StorageModule {}
