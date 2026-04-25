import { describe, it, expect } from 'vitest';
import { DefaultMaskingService } from '@/infra/shared/default-masking-service';

describe('DefaultMaskingService', () => {
  const service = new DefaultMaskingService();

  describe('maskEmail', () => {
    it('keeps the first letter of the local part and the full domain', () => {
      expect(service.maskEmail('joao.silva@example.com')).toBe('j*********@example.com');
    });

    it('masks a single-letter local part with a single asterisk', () => {
      expect(service.maskEmail('a@example.com')).toBe('a*@example.com');
    });

    it('returns the original string when the email has no "@"', () => {
      expect(service.maskEmail('notanemail')).toBe('notanemail');
    });

    it('returns the original string when the local part is empty', () => {
      expect(service.maskEmail('@example.com')).toBe('@example.com');
    });
  });

  describe('maskName', () => {
    it('masks every part keeping only the first letter', () => {
      expect(service.maskName('João Carlos Silva')).toBe('J*** C*** S***');
    });

    it('masks a single-part name as well', () => {
      expect(service.maskName('João')).toBe('J***');
    });

    it('handles extra whitespace between parts', () => {
      expect(service.maskName('  Maria   das   Dores  ')).toBe('M*** d*** D***');
    });

    it('returns the original input when the name is empty', () => {
      expect(service.maskName('')).toBe('');
      expect(service.maskName('   ')).toBe('   ');
    });
  });

  describe('maskCpf', () => {
    it('masks a plain 11-digit cpf keeping the first two and last two digits', () => {
      expect(service.maskCpf('12345678909')).toBe('12*.***.***-09');
    });

    it('masks a formatted cpf string', () => {
      expect(service.maskCpf('123.456.789-09')).toBe('12*.***.***-09');
    });

    it('returns the original string when the cpf has an invalid length', () => {
      expect(service.maskCpf('123')).toBe('123');
      expect(service.maskCpf('123456789012')).toBe('123456789012');
    });
  });
});
