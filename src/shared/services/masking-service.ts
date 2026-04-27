export interface MaskingService {
  maskEmail(email: string): string;
  maskName(name: string): string;
  maskCpf(cpf: string): string;
}
