import { describe, it, expect } from 'vitest';
import dicomParser from 'dicom-parser';
import { buildDicomFixture } from '@/tests/helpers/dicom-fixtures';

describe('buildDicomFixture', () => {
  it('produz um DICOM que o dicom-parser lê', () => {
    const buf = buildDicomFixture({
      patientName: 'Silva^João',
      patientSex: 'M',
      patientBirthDate: '19800512',
      laterality: 'R',
    });
    const ds = dicomParser.parseDicom(buf);
    expect(ds.string('x00100010')).toBe('Silva^João');
    expect(ds.string('x00100040')).toBe('M');
    expect(ds.string('x00100030')).toBe('19800512');
    const pixel = ds.elements['x7fe00010'];
    expect(pixel).toBeDefined();
    expect(pixel.length).toBe(2 * 2 * 3); // 2x2 RGB
  });
});
