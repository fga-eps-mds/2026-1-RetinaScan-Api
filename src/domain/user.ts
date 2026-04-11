export type UserRole = 'ADMIN' | 'MEDICO';

export interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: UserRole | null;
  birthDate: string | null;
  crm: string | null;
  cpf: string | null;
  identityNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
}
