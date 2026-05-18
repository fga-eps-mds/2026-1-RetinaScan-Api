import type { IdAdminSearchDoctors } from '../repositories';
import type { SearchDoctorsCriteria, SearchDoctorsPagination, SearchDoctorsResult } from '../domain';

interface Request {
  adminId: string;
  criteria: SearchDoctorsCriteria;
  pagination: SearchDoctorsPagination;
}

export class SearchDoctorsUseCase {
  constructor(private doctorsRepository: IdAdminSearchDoctors) {}

  async execute({ adminId, criteria, pagination }: Request): Promise<SearchDoctorsResult & { message: string }> {
    const searchResult = await this.doctorsRepository.searchByAdmin(adminId, criteria, pagination);

    if (searchResult.data.length === 0) {
      return {
        message: 'Nenhum médico encontrado com os critérios informados.',
        data: [],
        pagination: searchResult.pagination,
      };
    }

    return {
      message: 'Médicos encontrados com sucesso.',
      data: searchResult.data,
      pagination: searchResult.pagination,
    };
  }
}
