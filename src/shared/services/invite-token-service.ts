export type InviteTokenPayload = {
  sub: string;
  email: string;
  nomeCompleto: string | null;
  tipoPerfil: 'MEDICO' | 'ESPECIALISTA' | null;
};

export interface InviteTokenService {
  sign(payload: InviteTokenPayload): Promise<string>;
  verify(token: string): Promise<InviteTokenPayload>;
}
