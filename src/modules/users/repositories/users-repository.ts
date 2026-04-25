import type { SolicitacaoCpfCrm, SolicitacaoStatus, Usuario } from '@/modules/users/domain';

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
}

export type SolicitarAlteracaoCpfCrmInput = {
  idUsuario: string;
  cpfNovo?: string;
  crmNovo?: string;
};

export type ListarSolicitacoesCpfCrmInput = {
  status?: SolicitacaoStatus;
  idUsuario?: string;
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
