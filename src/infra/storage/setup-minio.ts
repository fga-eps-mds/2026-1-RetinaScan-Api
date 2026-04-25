import logger from '@/infra/logger';
import { type BucketName, Buckets } from '@/shared/services';
import { bucketAccess } from './bucket-access';
import { minioClient } from './minio-client';

function publicReadPolicy(bucket: string): string {
  return JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  });
}

async function ensureBucket(bucket: BucketName): Promise<void> {
  const exists = await minioClient.bucketExists(bucket);

  if (!exists) {
    await minioClient.makeBucket(bucket);
    logger.info(`Bucket "${bucket}" criado`);
  }

  if (bucketAccess[bucket] === 'public') {
    await minioClient.setBucketPolicy(bucket, publicReadPolicy(bucket));
    logger.info(`Bucket "${bucket}" configurado com leitura pública`);
  }
}

export async function setupMinio(): Promise<void> {
  await Promise.all(Object.values(Buckets).map(ensureBucket));
}
