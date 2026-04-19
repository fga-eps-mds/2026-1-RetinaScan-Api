import { randomBytes } from 'node:crypto';

export interface MultipartPayload {
  body: Buffer;
  headers: {
    'content-type': string;
    'content-length': string;
  };
}

function buildPayload(boundary: string, body: Buffer): MultipartPayload {
  return {
    body,
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
      'content-length': String(body.length),
    },
  };
}

export function buildMultipart(
  fieldName: string,
  filename: string,
  contentType: string,
  fileBuffer: Buffer,
): MultipartPayload {
  const boundary = `----TestBoundary${Date.now()}${randomBytes(8).toString('hex')}`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  return buildPayload(boundary, body);
}

export function buildEmptyMultipart(): MultipartPayload {
  const boundary = '----TestBoundaryEmpty';
  return buildPayload(boundary, Buffer.from(`--${boundary}--\r\n`));
}
