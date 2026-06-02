export function getErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const maybeBody = (error as { body?: unknown }).body;

  if (typeof maybeBody !== 'object' || maybeBody === null) {
    return null;
  }

  const maybeCode = (maybeBody as { code?: unknown }).code;

  return typeof maybeCode === 'string' ? maybeCode : null;
}
