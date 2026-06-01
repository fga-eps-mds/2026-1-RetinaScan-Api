import { env } from '@/env';
import type {
  BucketName,
  CopyObjectInput,
  GetPresignedUrlInput,
  StorageService,
  UploadInput,
} from '@/shared/services/storage-service';
import { minioClient } from './minio-client';

export class MinioStorageService implements StorageService {
  async upload(input: UploadInput, bucket: BucketName): Promise<string> {
    await minioClient.putObject(bucket, input.key, input.buffer, input.buffer.length, {
      'Content-Type': input.contentType,
    });

    const baseUrl = env.MINIO_PUBLIC_URL.replace(/\/$/, '');
    return `${baseUrl}/${bucket}/${input.key}`;
  }

  async uploadPrivate(input: UploadInput, bucket: BucketName): Promise<void> {
    await minioClient.putObject(bucket, input.key, input.buffer, input.buffer.length, {
      'Content-Type': input.contentType,
    });
  }

  async deleteByUrl(url: string, bucket: BucketName): Promise<void> {
    const { pathname } = new URL(url);
    const bucketPath = `/${bucket}/`;
    const key = pathname.slice(pathname.indexOf(bucketPath) + bucketPath.length);

    await minioClient.removeObject(bucket, key);
  }

  async deleteByKey(key: string, bucket: BucketName): Promise<void> {
    await minioClient.removeObject(bucket, key);
  }

  async getPresignedUrl(input: GetPresignedUrlInput): Promise<string> {
    return minioClient.presignedGetObject(input.bucket, input.key, input.expiresInSeconds);
  }

  async objectExists(key: string, bucket: BucketName): Promise<boolean> {
    try {
      await minioClient.statObject(bucket, key);
      return true;
    } catch {
      return false;
    }
  }

  async copy(input: CopyObjectInput, bucket: BucketName): Promise<void> {
    await minioClient.copyObject(bucket, input.destinationKey, `/${bucket}/${input.sourceKey}`);
  }
}
