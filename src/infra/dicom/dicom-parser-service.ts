import dicomParser from 'dicom-parser';
import sharp from 'sharp';
import type { DicomExtractResult, DicomService } from '@/shared/services/dicom-service';
import { ValidationError } from '@/shared/errors';
import {
  parsePatientName,
  normalizeDicomDate,
  mapSexo,
  mapLateralidade,
  buildDescricao,
} from './dicom-metadata-mapper';
import logger from '@/infra/logger';

const UNCOMPRESSED_TRANSFER_SYNTAXES = new Set(['1.2.840.10008.1.2', '1.2.840.10008.1.2.1']);

const MAX_PIXELS = 50_000_000;

export class DicomParserService implements DicomService {
  async extract(buffer: Buffer): Promise<DicomExtractResult> {
    const dataset = this.parse(buffer);
    this.assertSupportedTransferSyntax(dataset);

    const jpeg = await this.renderJpeg(dataset);
    const lateralidade = mapLateralidade(dataset.string('x00200062'));

    let metadata: DicomExtractResult['metadata'] = {};
    try {
      metadata = this.mapMetadata(dataset);
    } catch (error: unknown) {
      logger.error('Error mapping DICOM metadata', { error });
    }

    return { metadata, lateralidade, jpeg };
  }

  private parse(buffer: Buffer): dicomParser.DataSet {
    try {
      return dicomParser.parseDicom(buffer);
    } catch {
      throw new ValidationError(
        [{ path: ['arquivo'], message: 'Arquivo DICOM inválido ou corrompido.' }],
        true,
      );
    }
  }

  private assertSupportedTransferSyntax(dataset: dicomParser.DataSet): void {
    const ts = dataset.string('x00020010');
    if (!ts || !UNCOMPRESSED_TRANSFER_SYNTAXES.has(ts)) {
      throw new ValidationError(
        [
          {
            path: ['arquivo'],
            message: 'Formato de imagem DICOM não suportado. Envie um JPEG/PNG.',
          },
        ],
        true,
      );
    }
  }

  private mapMetadata(dataset: dicomParser.DataSet): DicomExtractResult['metadata'] {
    return filterDefined({
      nomeCompleto: parsePatientName(dataset.string('x00100010')),
      sexo: mapSexo(dataset.string('x00100040')),
      dtNascimento: normalizeDicomDate(dataset.string('x00100030')),
      dtHora: this.mapDtHora(dataset),
      descricao: buildDescricao({
        historia: dataset.string('x001021b0'),
        comentarios: dataset.string('x00204000'),
        estudo: dataset.string('x00081030'),
      }),
    });
  }

  private mapDtHora(dataset: dicomParser.DataSet): string | undefined {
    const date = normalizeDicomDate(dataset.string('x00080020'));
    if (!date) return undefined;

    const raw = (dataset.string('x00080030') ?? '').replace(/\D/g, '').padEnd(6, '0').slice(0, 6);
    const time = `${raw.slice(0, 2)}:${raw.slice(2, 4)}:${raw.slice(4, 6)}`;

    const dt = new Date(`${date}T${time}Z`);
    return Number.isNaN(dt.getTime()) ? undefined : dt.toISOString();
  }

  private async renderJpeg(dataset: dicomParser.DataSet): Promise<Buffer> {
    const { rows, columns, channels, pixels } = this.extractPixelData(dataset);

    try {
      return await sharp(pixels, { raw: { width: columns, height: rows, channels } })
        .jpeg()
        .toBuffer();
    } catch {
      throw this.unsupportedImage();
    }
  }

  private extractPixelData(dataset: dicomParser.DataSet) {
    const pixelElement = dataset.elements['x7fe00010'] as dicomParser.Element | undefined;
    if (!pixelElement) {
      throw new ValidationError(
        [{ path: ['arquivo'], message: 'DICOM sem dados de imagem.' }],
        true,
      );
    }

    const rows = dataset.uint16('x00280010');
    const columns = dataset.uint16('x00280011');
    if (!rows || !columns) {
      throw new ValidationError(
        [{ path: ['arquivo'], message: 'DICOM sem dimensões de imagem.' }],
        true,
      );
    }

    this.assertPixelFormat(dataset, rows, columns);

    const samplesPerPixel = dataset.uint16('x00280002') ?? 1;
    const channels: sharp.Channels = samplesPerPixel === 1 ? 1 : 3;
    const pixels = this.slicePixelBuffer(dataset, pixelElement, rows, columns, channels);

    return { rows, columns, channels, pixels };
  }

  private assertPixelFormat(dataset: dicomParser.DataSet, rows: number, columns: number): void {
    const bitsAllocated = dataset.uint16('x00280100');
    const planarConfig = dataset.uint16('x00280006');
    const samplesPerPixel = dataset.uint16('x00280002') ?? 1;
    const photometric = dataset.string('x00280004')?.trim().toUpperCase();

    if (bitsAllocated !== 8) throw this.unsupportedImage();
    if (planarConfig === 1) throw this.unsupportedImage();
    if (samplesPerPixel === 3 && photometric !== 'RGB') throw this.unsupportedImage();
    if (samplesPerPixel === 1 && photometric !== 'MONOCHROME2') throw this.unsupportedImage();
    if (samplesPerPixel !== 1 && samplesPerPixel !== 3) throw this.unsupportedImage();
    if (rows * columns > MAX_PIXELS) throw this.unsupportedImage();
  }

  private slicePixelBuffer(
    dataset: dicomParser.DataSet,
    pixelElement: dicomParser.Element,
    rows: number,
    columns: number,
    channels: number,
  ): Buffer {
    const expectedLength = rows * columns * channels;
    const ba = dataset.byteArray;
    const start = ba.byteOffset + pixelElement.dataOffset;
    const len = Math.min(pixelElement.length, expectedLength);

    if (start < 0 || start + len > ba.buffer.byteLength) {
      throw this.unsupportedImage();
    }

    return Buffer.from(ba.buffer, start, len);
  }

  private unsupportedImage(): ValidationError {
    return new ValidationError(
      [{ path: ['arquivo'], message: 'Imagem DICOM inválida ou não suportada.' }],
      true,
    );
  }
}

function filterDefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
