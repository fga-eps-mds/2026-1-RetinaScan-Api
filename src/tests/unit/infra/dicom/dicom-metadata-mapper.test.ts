import { describe, it, expect } from 'vitest';
import {
  parsePatientName,
  normalizeDicomDate,
  mapSexo,
  mapLateralidade,
  buildDescricao,
} from '@/infra/dicom/dicom-metadata-mapper';

describe('parsePatientName', () => {
  it('monta "Nome Sobrenome" a partir de carets Sobrenome^Nome', () => {
    expect(parsePatientName('Silva^João')).toBe('João Silva');
  });
  it('lida com componente único', () => {
    expect(parsePatientName('ANONYMOUS')).toBe('ANONYMOUS');
  });
  it('ignora componentes vazios e espaços', () => {
    expect(parsePatientName('Souza^Maria^ ^^')).toBe('Maria Souza');
  });
  it('retorna undefined pra vazio/ausente', () => {
    expect(parsePatientName('')).toBeUndefined();
    expect(parsePatientName(undefined)).toBeUndefined();
  });
});

describe('normalizeDicomDate', () => {
  it('converte YYYYMMDD em AAAA-MM-DD', () => {
    expect(normalizeDicomDate('19800512')).toBe('1980-05-12');
  });
  it('retorna undefined pra formato inválido ou vazio', () => {
    expect(normalizeDicomDate('1980')).toBeUndefined();
    expect(normalizeDicomDate('')).toBeUndefined();
    expect(normalizeDicomDate(undefined)).toBeUndefined();
  });
});

describe('mapSexo', () => {
  it('mapeia M/F/O para o enum', () => {
    expect(mapSexo('M')).toBe('MASCULINO');
    expect(mapSexo('F')).toBe('FEMININO');
    expect(mapSexo('O')).toBe('OUTRO');
  });
  it('é case-insensitive e ignora espaços', () => {
    expect(mapSexo(' f ')).toBe('FEMININO');
  });
  it('retorna undefined pra valor desconhecido/vazio', () => {
    expect(mapSexo('X')).toBeUndefined();
    expect(mapSexo(undefined)).toBeUndefined();
  });
});

describe('mapLateralidade', () => {
  it('mapeia R->OD e L->OE', () => {
    expect(mapLateralidade('R')).toBe('OD');
    expect(mapLateralidade('L')).toBe('OE');
  });
  it('retorna undefined pra desconhecido', () => {
    expect(mapLateralidade('B')).toBeUndefined();
    expect(mapLateralidade(undefined)).toBeUndefined();
  });
});

describe('buildDescricao', () => {
  it('concatena os campos presentes com rótulo', () => {
    expect(
      buildDescricao({ historia: 'diabético', comentarios: 'borrado', estudo: 'Retinografia' }),
    ).toBe('Histórico: diabético\nComentários: borrado\nEstudo: Retinografia');
  });
  it('omite campos ausentes', () => {
    expect(buildDescricao({ estudo: 'Retinografia' })).toBe('Estudo: Retinografia');
  });
  it('retorna undefined quando nada presente', () => {
    expect(buildDescricao({})).toBeUndefined();
  });
});
