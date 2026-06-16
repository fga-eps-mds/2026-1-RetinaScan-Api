export type SpecialistReport = {
  id: string;
  examId: string;
  specialistId: string;
  texto: string;
  html: string;
  conteudo: string;
  resultadoIaValido: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type SpecialistReportDTO = {
  id: string;
  examId: string;
  specialistId: string;
  specialist: {
    id: string;
    nomeCompleto: string;
  };
  texto: string;
  html: string;
  conteudo: string;
  resultadoIaValido: boolean;
  createdAt: Date;
  updatedAt: Date;
};
