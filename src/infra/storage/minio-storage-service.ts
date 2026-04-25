import { env } from '@/env';
import type { BucketName, StorageService, UploadInput } from '@/shared/services/storage-service';
import { minioClient } from './minio-client';

export class MinioStorageService implements StorageService {
  async upload(input: UploadInput, bucket: BucketName): Promise<string> {
    await minioClient.putObject(bucket, input.key, input.buffer, input.buffer.length, {
      'Content-Type': input.contentType,
    });

    const baseUrl = env.MINIO_PUBLIC_URL.replace(/\/$/, '');
    return `${baseUrl}/${bucket}/${input.key}`;
  }
}
