export const Buckets = {
  userImages: 'user-images',
} as const;

export type BucketName = (typeof Buckets)[keyof typeof Buckets];

export interface UploadInput {
  key: string;
  buffer: Buffer;
  contentType: string;
}

export interface StorageService {
  upload(input: UploadInput, bucket: BucketName): Promise<string>;
}
