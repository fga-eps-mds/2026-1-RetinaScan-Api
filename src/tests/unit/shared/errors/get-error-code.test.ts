import { getErrorCode } from '@/shared/errors/get-error-code';
import { describe, expect, it } from 'vitest';

describe('getErrorCode', () => {
  it('returns null when error is null', () => {
    expect(getErrorCode(null)).toBeNull();
  });

  it('returns null when error is undefined', () => {
    expect(getErrorCode(undefined)).toBeNull();
  });

  it('returns null when error is a primitive', () => {
    expect(getErrorCode('erro')).toBeNull();
    expect(getErrorCode(123)).toBeNull();
    expect(getErrorCode(true)).toBeNull();
    expect(getErrorCode(Symbol('x'))).toBeNull();
  });

  it('returns null when error has no body', () => {
    expect(getErrorCode({})).toBeNull();
  });

  it('returns null when body is null', () => {
    expect(getErrorCode({ body: null })).toBeNull();
  });

  it('returns null when body is not an object', () => {
    expect(getErrorCode({ body: 'x' })).toBeNull();
    expect(getErrorCode({ body: 123 })).toBeNull();
    expect(getErrorCode({ body: true })).toBeNull();
  });

  it('returns null when body.code does not exist', () => {
    expect(getErrorCode({ body: {} })).toBeNull();
  });

  it('returns null when body.code is not a string', () => {
    expect(getErrorCode({ body: { code: 123 } })).toBeNull();
    expect(getErrorCode({ body: { code: false } })).toBeNull();
    expect(getErrorCode({ body: { code: null } })).toBeNull();
    expect(getErrorCode({ body: { code: {} } })).toBeNull();
  });

  it('returns the code when body.code is a string', () => {
    expect(getErrorCode({ body: { code: 'EXAM_NOT_FOUND' } })).toBe('EXAM_NOT_FOUND');
  });
});
