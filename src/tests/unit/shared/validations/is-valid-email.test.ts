import { describe, it, expect } from 'vitest';
import { isValidEmail } from '@/shared/validators/is-valid-email';

describe('isValidEmail', () => {
  it('should return true for valid email', () => {
    expect(isValidEmail('gustavo@email.com')).toBe(true);
  });

  it('should return true for valid email with uppercase letters', () => {
    expect(isValidEmail('GUSTAVO@EMAIL.COM')).toBe(true);
  });

  it('should return true for valid email with spaces around', () => {
    expect(isValidEmail('  gustavo@email.com  ')).toBe(true);
  });

  it('should return true for subdomain email', () => {
    expect(isValidEmail('user@mail.company.com')).toBe(true);
  });

  it('should return false when email is empty', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('should return false when missing @', () => {
    expect(isValidEmail('gustavoemail.com')).toBe(false);
  });

  it('should return false when missing local part', () => {
    expect(isValidEmail('@email.com')).toBe(false);
  });

  it('should return false when missing domain', () => {
    expect(isValidEmail('gustavo@')).toBe(false);
  });

  it('should return false when missing dot in domain', () => {
    expect(isValidEmail('gustavo@email')).toBe(false);
  });

  it('should return false when domain extension has less than 2 chars', () => {
    expect(isValidEmail('gustavo@email.c')).toBe(false);
  });

  it('should return false when contains spaces inside email', () => {
    expect(isValidEmail('gus tavo@email.com')).toBe(false);
    expect(isValidEmail('gustavo@ema il.com')).toBe(false);
  });
});
