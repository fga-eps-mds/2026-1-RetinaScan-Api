import { IdAdminSearchDoctors } from '../repositories';
import { SearchDoctorsCriteria } from '../domain';

interface Request {
  adminId: string;
  criteria: SearchDoctorsCriteria;
}

export class SearchDoctorsUseCase {
  constructor(private doctorsRepository: IdAdminSearchDoctors) {}

  async execute({ adminId, criteria }: Request) {
    const doctors = await this.doctorsRepository.searchByAdmin(adminId, criteria);

    if (doctors.length === 0) {
      return {
        message: 'Nenhum médico encontrado com os critérios informados.',
        data: []
      };
    }

    return {
      message: 'Médicos encontrados com sucesso.',
      data: doctors
    };
  }
}