import type { SearchDoctorsCriteria } from '@/modules/users/domain';
import { User } from 'better-auth';

export interface IdAdminSearchDoctors {
  searchByAdmin(adminId: string, criteria: SearchDoctorsCriteria): Promise<User[]>;
}