import { Client } from 'minio';
import { env } from '@/env';

export const minioClient = new Client({
  endPoint: String(env.MINIO_ENDPOINT),
  port: Number(env.MINIO_PORT),
  useSSL: Boolean(env.MINIO_USE_SSL),
  accessKey: String(env.MINIO_ACCESS_KEY),
  secretKey: String(env.MINIO_SECRET_KEY),
});
