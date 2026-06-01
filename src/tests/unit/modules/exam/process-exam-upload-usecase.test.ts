import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Buckets, type DicomService, type StorageService } from '@/shared/services';
import { ProcessExamUploadUseCase } from '@/modules/exam/use-cases/process-exam-upload-usecase';
import { LateralidadeOlho } from '@/modules/exam/imagem';
import { detectFileType } from '@/modules/exam/file-type';

vi.mock('@/modules/exam/file-type', () => ({ detectFileType: vi.fn() }));

class FakeStorage implements StorageService {
  upload = vi.fn();
  uploadPrivate = vi.fn().mockResolvedValue(undefined);
  deleteByUrl = vi.fn();
  deleteByKey = vi.fn().mockResolvedValue(undefined);
  getPresignedUrl = vi.fn().mockResolvedValue('https://preview');
  objectExists = vi.fn();
  copy = vi.fn();
}
class FakeDicom implements DicomService {
  extract = vi.fn();
}

const detectMock = vi.mocked(detectFileType);
let storage: FakeStorage;
let dicom: FakeDicom;
let usecase: ProcessExamUploadUseCase;

beforeEach(() => {
  storage = new FakeStorage();
  dicom = new FakeDicom();
  usecase = new ProcessExamUploadUseCase(storage, dicom);
  detectMock.mockReset();
});

const jpegFile = (field: 'olhoDireito' | 'olhoEsquerdo') => ({
  field,
  buffer: Buffer.from('jpeg-bytes'),
});

describe('ProcessExamUploadUseCase', () => {
  it('jpeg: grava em pending/ e não retorna metadados', async () => {
    detectMock.mockReturnValue('jpeg');
    const out = await usecase.execute({ userId: 'u1', arquivos: [jpegFile('olhoDireito')] });
    expect(out.metadados).toBeUndefined();
    expect(out.imagens).toHaveLength(1);
    expect(out.imagens[0].lateralidade).toBe(LateralidadeOlho.OD);
    expect(out.imagens[0].urlPreview).toBe('https://preview');
    expect(storage.uploadPrivate).toHaveBeenCalledWith(
      expect.objectContaining({ key: expect.stringMatching(/^pending\/u1\/.+\.jpg$/), contentType: 'image/jpeg' }),
      Buckets.examImages,
    );
    expect(dicom.extract).not.toHaveBeenCalled();
  });

  it('dicom: extrai metadados, grava o jpeg renderizado e consolida lateralidade', async () => {
    detectMock.mockReturnValue('dicom');
    dicom.extract.mockResolvedValue({
      metadata: { nomeCompleto: 'João Silva', sexo: 'MASCULINO' },
      lateralidade: LateralidadeOlho.OD,
      jpeg: Buffer.from('rendered-jpeg'),
    });
    const out = await usecase.execute({ userId: 'u1', arquivos: [jpegFile('olhoDireito')] });
    expect(out.metadados).toEqual({ nomeCompleto: 'João Silva', sexo: 'MASCULINO' });
    expect(out.imagens[0].lateralidade).toBe(LateralidadeOlho.OD);
    expect(storage.uploadPrivate).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: 'image/jpeg', buffer: Buffer.from('rendered-jpeg') }),
      Buckets.examImages,
    );
  });

  it('2 dicoms: consolida campos de paciente (primeiro presente vence)', async () => {
    detectMock.mockReturnValue('dicom');
    dicom.extract
      .mockResolvedValueOnce({ metadata: { nomeCompleto: 'João Silva' }, lateralidade: LateralidadeOlho.OD, jpeg: Buffer.from('a') })
      .mockResolvedValueOnce({ metadata: { nomeCompleto: 'OUTRO', sexo: 'FEMININO' }, lateralidade: LateralidadeOlho.OE, jpeg: Buffer.from('b') });
    const out = await usecase.execute({ userId: 'u1', arquivos: [jpegFile('olhoDireito'), jpegFile('olhoEsquerdo')] });
    expect(out.metadados).toEqual({ nomeCompleto: 'João Silva', sexo: 'FEMININO' });
    expect(out.imagens).toHaveLength(2);
  });

  it('dicom sem metadados extraídos: metadados vem {} (presente)', async () => {
    detectMock.mockReturnValue('dicom');
    dicom.extract.mockResolvedValue({ metadata: {}, jpeg: Buffer.from('x') });
    const out = await usecase.execute({ userId: 'u1', arquivos: [jpegFile('olhoDireito')] });
    expect(out.metadados).toEqual({});
  });

  it('tipo desconhecido: ValidationError e nada gravado', async () => {
    detectMock.mockReturnValue('unknown');
    await expect(usecase.execute({ userId: 'u1', arquivos: [jpegFile('olhoDireito')] })).rejects.toMatchObject({ name: 'ValidationError' });
    expect(storage.uploadPrivate).not.toHaveBeenCalled();
  });

  it('rollback: se o upload do 2º arquivo falha, apaga o 1º já gravado', async () => {
    detectMock.mockReturnValue('jpeg');
    storage.uploadPrivate.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('boom'));
    await expect(usecase.execute({ userId: 'u1', arquivos: [jpegFile('olhoDireito'), jpegFile('olhoEsquerdo')] })).rejects.toThrow('boom');
    expect(storage.deleteByKey).toHaveBeenCalledTimes(1);
  });
});
