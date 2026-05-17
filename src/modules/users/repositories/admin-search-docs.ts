import type { SearchDoctorsCriteria, Usuario } from '@/modules/users/domain';

export interface IdAdminSearchDoctors {
  searchByAdmin(adminId: string, criteria: SearchDoctorsCriteria): Promise<Usuario[]>;
}
