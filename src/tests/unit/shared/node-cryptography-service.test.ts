import { describe, it, expect } from 'vitest';
import { NodeCryptoCryptographyService } from '@/infra/shared/node-cryptography-service';

describe('NodeCryptoCryptographyService', () => {
  const service = new NodeCryptoCryptographyService();

  it('should encrypt and decrypt back to the original text', () => {
    const text = 'texto sensível do paciente';

    const { encryptedText } = service.encrypt({ text });
    const { text: decrypted } = service.decrypt({ encryptedText });

    expect(decrypted).toBe(text);
  });

  it('should not return the plain text in the encrypted payload', () => {
    const text = 'conteúdo-confidencial';

    const { encryptedText } = service.encrypt({ text });

    expect(encryptedText).not.toContain(text);
  });

  it('should produce different ciphertexts for the same input on each call', () => {
    const text = 'mesmo-texto';

    const first = service.encrypt({ text }).encryptedText;
    const second = service.encrypt({ text }).encryptedText;

    expect(first).not.toBe(second);
  });

  it('should return the encrypted payload in the format iv:ciphertext:authTag', () => {
    const { encryptedText } = service.encrypt({ text: 'payload' });

    const parts = encryptedText.split(':');
    expect(parts).toHaveLength(3);
    parts.forEach((part: string) => expect(part.length).toBeGreaterThan(0));
  });

  it('should handle unicode characters', () => {
    const text = '日本語 🍺 çñ';

    const { encryptedText } = service.encrypt({ text });
    const { text: decrypted } = service.decrypt({ encryptedText });

    expect(decrypted).toBe(text);
  });

  it('should throw when the encrypted payload is malformed', () => {
    expect(() => service.decrypt({ encryptedText: 'apenas-uma-parte' })).toThrow(
      'Invalid encrypted payload',
    );
    expect(() => service.decrypt({ encryptedText: 'iv:ciphertext' })).toThrow(
      'Invalid encrypted payload',
    );
  });

  it('should throw when the auth tag has been tampered with', () => {
    const { encryptedText } = service.encrypt({ text: 'segredo' });
    const [iv, cipher] = encryptedText.split(':');
    const tampered = [iv, cipher, Buffer.from('tampered-tag').toString('base64')].join(':');

    expect(() => service.decrypt({ encryptedText: tampered })).toThrow();
  });

  it('should throw when the ciphertext has been tampered with', () => {
    const { encryptedText } = service.encrypt({ text: 'segredo' });
    const [iv, , authTag] = encryptedText.split(':');
    const tampered = [iv, Buffer.from('outro-conteudo').toString('base64'), authTag].join(':');

    expect(() => service.decrypt({ encryptedText: tampered })).toThrow();
  });
});
