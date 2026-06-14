import { SignJWT, jwtVerify } from 'jose';
import { env } from '@/env';
import type {
  InviteTokenPayload,
  InviteTokenService,
} from '@/shared/services/invite-token-service';

export class JoseInviteTokenService implements InviteTokenService {
  private readonly secret: Uint8Array;

  constructor() {
    this.secret = new TextEncoder().encode(env.INVITE_JWT_SECRET);
  }

  async sign(payload: InviteTokenPayload): Promise<string> {
    return new SignJWT({
      email: payload.email,
      nomeCompleto: payload.nomeCompleto,
      tipoPerfil: payload.tipoPerfil,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(this.secret);
  }

  async verify(token: string): Promise<InviteTokenPayload> {
    const { payload } = await jwtVerify(token, this.secret);
    return {
      sub: payload.sub as string,
      email: payload['email'] as string,
      nomeCompleto: (payload['nomeCompleto'] as string | null) ?? null,
      tipoPerfil: (payload['tipoPerfil'] as 'MEDICO' | 'ESPECIALISTA' | null) ?? null,
    };
  }
}
