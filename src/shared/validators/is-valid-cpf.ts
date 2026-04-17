export function isValidCpf(cpf: string): boolean {
  if (!cpf) return false;

  const cleanCpf = cpf.replace(/\D/g, '');

  if (cleanCpf.length !== 11) {
    return false;
  }

  // rejeita todos iguais
  if (/^(\d)\1{10}$/.test(cleanCpf)) {
    return false;
  }

  let sum = 0;

  for (let i = 0; i < 9; i++) {
    sum += Number(cleanCpf[i]) * (10 - i);
  }

  let firstDigit = (sum * 10) % 11;

  if (firstDigit === 10) {
    firstDigit = 0;
  }

  if (firstDigit !== Number(cleanCpf[9])) {
    return false;
  }

  sum = 0;

  for (let i = 0; i < 10; i++) {
    sum += Number(cleanCpf[i]) * (11 - i);
  }

  let secondDigit = (sum * 10) % 11;

  if (secondDigit === 10) {
    secondDigit = 0;
  }

  if (secondDigit !== Number(cleanCpf[10])) {
    return false;
  }

  return true;
}
