import { describe, it, expect } from 'vitest';
import { detectFileType } from '@/modules/exam/file-type';

function dicomBuffer(): Buffer {
  // 128 bytes de preâmbulo + "DICM"
  return Buffer.concat([Buffer.alloc(128, 0), Buffer.from('DICM', 'ascii'), Buffer.alloc(8, 0)]);
}

describe('detectFileType', () => {
  it('detecta DICOM pelo marcador DICM no offset 128', () => {
    expect(detectFileType(dicomBuffer())).toBe('dicom');
  });

  it('detecta JPEG pela assinatura FF D8 FF', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectFileType(jpeg)).toBe('jpeg');
  });

  it('detecta PNG pela assinatura 89 50 4E 47', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectFileType(png)).toBe('png');
  });

  it('retorna unknown pra qualquer outra coisa', () => {
    expect(detectFileType(Buffer.from('hello world'))).toBe('unknown');
  });

  it('não confunde buffer curto com DICOM', () => {
    expect(detectFileType(Buffer.alloc(10, 0))).toBe('unknown');
  });
});
