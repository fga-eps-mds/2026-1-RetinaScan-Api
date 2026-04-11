import type { User, UserRole } from '@/domain/user';

export interface IUsersRepository {
  findByEmail(email: string): Promise<User | null>;
  updateRoleByEmail(email: string, role: UserRole): Promise<void>;
}
