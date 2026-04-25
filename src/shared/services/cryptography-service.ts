export type EncryptInput = { text: string };
export type EncryptOutput = { encryptedText: string };
export type DecryptInput = { encryptedText: string };
export type DecryptOutput = { text: string };

export interface CryptographyService {
  encrypt(input: EncryptInput): EncryptOutput;
  decrypt(input: DecryptInput): DecryptOutput;
}
