import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { DicomParserService } from '@/infra/dicom/dicom-parser-service';
import { buildDicomFixture } from '@/tests/helpers/dicom-fixtures';
import { ValidationError } from '@/shared/errors';

describe('DicomParserService (integration)', () => {
  const service = new DicomParserService();

  it('extrai metadados normalizados de um DICOM válido', async () => {
    const buf = buildDicomFixture({
      patientName: 'Silva^João',
      patientSex: 'M',
      patientBirthDate: '19800512',
      laterality: 'R',
      studyDescription: 'Retinografia',
    });
    const result = await service.extract(buf);
    expect(result.metadata.nomeCompleto).toBe('João Silva');
    expect(result.metadata.sexo).toBe('MASCULINO');
    expect(result.metadata.dtNascimento).toBe('1980-05-12');
    expect(result.metadata.descricao).toContain('Estudo: Retinografia');
    expect(result.lateralidade).toBe('OD');
  });

  it('converte o pixel num jpeg válido', async () => {
    const buf = buildDicomFixture({ rows: 4, columns: 4 });
    const result = await service.extract(buf);
    const meta = await sharp(result.jpeg).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.width).toBe(4);
    expect(meta.height).toBe(4);
  });

  it('omite campos ausentes (metadados parciais)', async () => {
    const buf = buildDicomFixture({ patientName: 'Souza^Maria' });
    const result = await service.extract(buf);
    expect(result.metadata.nomeCompleto).toBe('Maria Souza');
    expect(result.metadata.sexo).toBeUndefined();
    expect(result.metadata.dtNascimento).toBeUndefined();
  });

  it('lança ValidationError pra buffer que não é DICOM', async () => {
    await expect(service.extract(Buffer.from('not a dicom'))).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita DICOM 16-bit (BitsAllocated != 8)', async () => {
    const buf = buildDicomFixture({ bitsAllocated: 16 });
    await expect(service.extract(buf)).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita DICOM com PlanarConfiguration 1 (planar)', async () => {
    const buf = buildDicomFixture({ planarConfiguration: 1 });
    await expect(service.extract(buf)).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita dimensões absurdas antes de alocar', async () => {
    const buf = buildDicomFixture({ rows: 8000, columns: 8000, skipPixelData: true });
    await expect(service.extract(buf)).rejects.toBeInstanceOf(ValidationError);
  });

  it('não quebra com studyDate inválido; dtHora fica undefined', async () => {
    const buf = buildDicomFixture({ patientBirthDate: '19800512', studyDate: '00000000' });
    const result = await service.extract(buf);
    expect(result.metadata.dtNascimento).toBe('1980-05-12');
    expect(result.metadata.dtHora).toBeUndefined();
  });
});
