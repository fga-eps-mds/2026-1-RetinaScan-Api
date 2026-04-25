import type { MaskingService } from '@/shared/services';

export class DefaultMaskingService implements MaskingService {
  maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;

    const visible = local[0];
    return `${visible}${'*'.repeat(Math.max(local.length - 1, 1))}@${domain}`;
  }

  maskName(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || parts[0] === '') return name;

    return parts.map((part) => `${part[0]}***`).join(' ');
  }

  maskCpf(cpf: string): string {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return cpf;

    const first = digits.slice(0, 2);
    const last = digits.slice(-2);
    return `${first}*.***.***-${last}`;
  }
}
