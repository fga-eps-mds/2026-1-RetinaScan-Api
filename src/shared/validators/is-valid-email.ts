export function isValidEmail(email: string): boolean {
  if (!email) return false;

  const normalized = email.trim().toLowerCase();

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  return regex.test(normalized);
}
