import type {
  SearchDoctorsCriteria,
  SearchDoctorsPagination,
  SearchDoctorsResult,
} from '@/modules/users/domain';

export interface IdAdminSearchDoctors {
  searchByAdmin(
    adminId: string,
    criteria: SearchDoctorsCriteria,
    pagination: SearchDoctorsPagination,
  ): Promise<SearchDoctorsResult>;
}
