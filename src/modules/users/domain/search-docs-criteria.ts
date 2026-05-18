import type { Usuario } from './usuario';

export interface SearchDoctorsCriteria {
  name?: string;
  crm?: string;
  email?: string;
}

export interface SearchDoctorsPagination {
  page: number;
  pageSize: number;
}

export interface SearchDoctorsResult {
  data: Usuario[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
