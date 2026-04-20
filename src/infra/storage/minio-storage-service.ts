/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { env } from '@/env';
import type { BucketName, StorageService, UploadInput } from '@/shared/services/storage-service';
import { minioClient } from './minio-client';

export class MinioStorageService implements StorageService {
  async upload(input: UploadInput, bucket: BucketName): Promise<string> {
    await minioClient.putObject(bucket, input.key, input.buffer, input.buffer.length, {
      'Content-Type': input.contentType,
    });

    const scheme = env.MINIO_USE_SSL ? 'https' : 'http';
    return `${scheme}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}/${bucket}/${input.key}`;
  }
}
