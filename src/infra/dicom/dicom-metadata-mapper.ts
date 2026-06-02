import { Sexo } from '@/modules/exam/exam';
import { LateralidadeOlho } from '@/modules/exam/imagem';

const SEXO_MAP: Record<string, Sexo> = {
  M: Sexo.MASCULINO,
  F: Sexo.FEMININO,
  O: Sexo.OUTRO,
};

const LATERALIDADE_MAP: Record<string, LateralidadeOlho> = {
  R: LateralidadeOlho.OD,
  L: LateralidadeOlho.OE,
};

export function parsePatientName(value?: string): string | undefined {
  if (!value) return undefined;

  const [sobrenome, nome, ...meio] = value
    .split('^')
    .map((p) => p.trim())
    .filter(Boolean);

  if (!sobrenome) return undefined;
  if (!nome) return sobrenome;

  return [...(meio.length ? [nome, ...meio] : [nome]), sobrenome].join(' ');
}

export function normalizeDicomDate(value?: string): string | undefined {
  if (!value || !/^\d{8}$/.test(value)) return undefined;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

export function mapSexo(value?: string): Sexo | undefined {
  return SEXO_MAP[value?.trim().toUpperCase() ?? ''];
}

export function mapLateralidade(value?: string): LateralidadeOlho | undefined {
  return LATERALIDADE_MAP[value?.trim().toUpperCase() ?? ''];
}

export interface DescricaoParts {
  historia?: string;
  comentarios?: string;
  estudo?: string;
}

export function buildDescricao({
  historia,
  comentarios,
  estudo,
}: DescricaoParts): string | undefined {
  const linhas = [
    historia && `Histórico: ${historia.trim()}`,
    comentarios && `Comentários: ${comentarios.trim()}`,
    estudo && `Estudo: ${estudo.trim()}`,
  ].filter(Boolean) as string[];

  return linhas.length > 0 ? linhas.join('\n') : undefined;
}
