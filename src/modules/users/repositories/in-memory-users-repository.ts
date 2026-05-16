import type { BuscaMedicos } from '@/modules/users/domain';
import { User } from 'better-auth';

export interface IdAdminSearchDoctors {
  // O adminId é obrigatório na assinatura para forçar o filtro
  searchByAdmin(adminId: string, criteria: BuscaMedicos): Promise<User[]>;
}