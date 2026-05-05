export const Buckets = {
  userImages: 'user-images',
  examImages: 'exam-images',
} as const;

export type BucketName = (typeof Buckets)[keyof typeof Buckets];

export interface UploadInput {
  key: string;
  buffer: Buffer;
  contentType: string;
}

export interface StorageService {
  upload(input: UploadInput, bucket: BucketName): Promise<string>;
  uploadPrivate(input: UploadInput, bucket: BucketName): Promise<void>;
  deleteByUrl(url: string, bucket: BucketName): Promise<void>;
  deleteByKey(key: string, bucket: BucketName): Promise<void>;
}
