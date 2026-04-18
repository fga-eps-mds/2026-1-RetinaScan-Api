import { type BucketName, Buckets } from '@/shared/services';

export type BucketAccess = 'public' | 'private';

export const bucketAccess: Record<BucketName, BucketAccess> = {
  [Buckets.userImages]: 'public',
};
