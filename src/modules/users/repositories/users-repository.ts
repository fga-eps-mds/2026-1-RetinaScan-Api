import type {
  SolicitacaoCpfCrm,
  SolicitacaoStatus,
  Usuario,
  InscricaoMedico,
  InscricaoStatus,
} from '@/modules/users/domain';

export type UsuarioFindByInput = {
  id?: string;
  email?: string;
  cpf?: string;
  crm?: string;
};
export type UsuarioFindByOutput = Usuario | null;

export type UsuarioUpdateInput = {
  nomeCompleto?: string;
  email?: string;
  dtNascimento?: string;
  image?: string;
  cpf?: string;
  crm?: string;
};

export type UsuarioUpdateOutput = Usuario | null;

export interface UsuariosRepository {
  findByEmail(email: string): Promise<Usuario | null>;
  findByCpf(cpf: string): Promise<Usuario | null>;
  findByCrm(crm: string): Promise<Usuario | null>;
  findBy(params: UsuarioFindByInput): Promise<UsuarioFindByOutput>;
  getAllUsers(): Promise<Usuario[]>;
  update(id: string, params: UsuarioUpdateInput): Promise<UsuarioUpdateOutput>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  searchAvailableDoctors(busca?: string, excludeId?: string): Promise<Usuario[]>;
}

export type SolicitarAlteracaoCpfCrmInput = {
  idUsuario: string;
  cpfNovo?: string;
  crmNovo?: string;
};

export type ListarSolicitacoesCpfCrmInput = {
  status?: SolicitacaoStatus;
  idUsuario?: string;
  relations?: boolean;
};

export type RejeitarSolicitacaoCpfCrmInput = {
  idSolicitacao: string;
  analisadoPor: string;
  motivoRejeicao: string;
};

export type AprovarSolicitacaoCpfCrmInput = {
  idSolicitacao: string;
  analisadoPor: string;
};

export interface SolicitacaoCpfCrmRepository {
  criar(input: SolicitarAlteracaoCpfCrmInput): Promise<SolicitacaoCpfCrm>;
  findPendenteByUsuario(idUsuario: string): Promise<SolicitacaoCpfCrm | null>;
  listar(input?: ListarSolicitacoesCpfCrmInput): Promise<SolicitacaoCpfCrm[]>;
  aprovar(input: AprovarSolicitacaoCpfCrmInput): Promise<SolicitacaoCpfCrm | null>;
  rejeitar(input: RejeitarSolicitacaoCpfCrmInput): Promise<SolicitacaoCpfCrm | null>;
}

export type CriarInscricaoInput = {
  id?: string;
  email: string;
  token: string;
  tokenExpiresAt: Date;
  invitedBy?: string | null;
  nomeCompleto?: string | null;
  tipoPerfil?: 'MEDICO' | 'ESPECIALISTA' | null;
};

export type SubmeterInscricaoInput = {
  id: string;
  nomeCompleto: string;
  cpf: string;
  crm: string;
  dtNascimento: string;
  encryptedPassword: string;
  submittedAt: Date;
};

export type AvaliarInscricaoInput = {
  id: string;
  decisao: 'APROVADA' | 'REJEITADA';
  analisadoPor: string;
  analisadoEm: Date;
  motivoRejeicao?: string;
};

export type ListarInscricoesInput = {
  status?: InscricaoStatus;
};

export interface InscricaoMedicoRepository {
  criar(input: CriarInscricaoInput): Promise<InscricaoMedico>;
  findByToken(token: string): Promise<InscricaoMedico | null>;
  findByEmail(email: string): Promise<InscricaoMedico | null>;
  findById(id: string): Promise<InscricaoMedico | null>;
  submeter(input: SubmeterInscricaoInput): Promise<InscricaoMedico>;
  avaliar(input: AvaliarInscricaoInput): Promise<InscricaoMedico>;
  listar(input?: ListarInscricoesInput): Promise<InscricaoMedico[]>;
}
