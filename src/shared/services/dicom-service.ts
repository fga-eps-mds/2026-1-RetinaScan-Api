import type { Sexo } from '@/modules/exam/exam';
import type { LateralidadeOlho } from '@/modules/exam/imagem';

export interface DicomMetadata {
  nomeCompleto?: string;
  sexo?: Sexo;
  dtNascimento?: string;
  dtHora?: string;
  descricao?: string;
}

export interface DicomExtractResult {
  metadata: DicomMetadata;
  lateralidade?: LateralidadeOlho;
  jpeg: Buffer;
}

export interface DicomService {
  extract(buffer: Buffer): Promise<DicomExtractResult>;
}
