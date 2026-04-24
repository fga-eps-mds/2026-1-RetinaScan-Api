import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import type {
  EncryptInput,
  EncryptOutput,
  DecryptInput,
  DecryptOutput,
  CryptographyService,
} from '@/shared/services';
import { Buffer } from 'node:buffer';
import { env } from '@/env';

export class NodeCryptoCryptographyService implements CryptographyService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16;
  private readonly keyLength = 32;
  private readonly secret = env.CRYPTOGRAPHY_SECRET;

  private readonly key: Buffer;

  constructor() {
    this.key = scryptSync(this.secret, 'salt', this.keyLength);
  }

  encrypt(input: EncryptInput): EncryptOutput {
    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    const encrypted = Buffer.concat([cipher.update(input.text, 'utf8'), cipher.final()]);

    const authTag = cipher.getAuthTag();

    const encryptedText = [
      iv.toString('base64'),
      encrypted.toString('base64'),
      authTag.toString('base64'),
    ].join(':');

    return { encryptedText };
  }

  decrypt(input: DecryptInput): DecryptOutput {
    const [ivBase64, encryptedBase64, authTagBase64] = input.encryptedText.split(':');

    if (!ivBase64 || !encryptedBase64 || !authTagBase64) {
      throw new Error('Invalid encrypted payload');
    }

    const iv = Buffer.from(ivBase64, 'base64');
    const encryptedText = Buffer.from(encryptedBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = createDecipheriv(this.algorithm, this.key, iv);

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);

    return {
      text: decrypted.toString('utf8'),
    };
  }
}
