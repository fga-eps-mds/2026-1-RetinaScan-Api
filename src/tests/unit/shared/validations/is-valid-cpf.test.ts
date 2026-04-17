import { describe, it, expect } from 'vitest';
import { isValidCpf } from '@/shared/validators/is-valid-cpf';

describe('isValidCpf', () => {
  it('should return true for valid CPF without mask', () => {
    expect(isValidCpf('52998224725')).toBe(true);
  });

  it('should return true for valid CPF with mask', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
  });

  it('should return false when CPF is empty', () => {
    expect(isValidCpf('')).toBe(false);
  });

  it('should return false when CPF has less than 11 digits', () => {
    expect(isValidCpf('1234567890')).toBe(false);
  });

  it('should return false when CPF has more than 11 digits', () => {
    expect(isValidCpf('123456789000')).toBe(false);
  });

  it('should return false when all digits are equal', () => {
    expect(isValidCpf('11111111111')).toBe(false);
    expect(isValidCpf('00000000000')).toBe(false);
    expect(isValidCpf('99999999999')).toBe(false);
  });

  it('should return false for invalid first check digit', () => {
    expect(isValidCpf('52998224735')).toBe(false);
  });

  it('should return false for invalid second check digit', () => {
    expect(isValidCpf('52998224724')).toBe(false);
  });

  it('should ignore non numeric characters', () => {
    expect(isValidCpf('529a982b247-25')).toBe(true);
  });

  it('should return false for random invalid CPF', () => {
    expect(isValidCpf('12345678901')).toBe(false);
  });
});
