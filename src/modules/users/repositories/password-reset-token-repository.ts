export type PasswordResetToken = {
  id: string;
  idUsuario: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreatePasswordResetTokenInput = {
  idUsuario: string;
  tokenHash: string;
  expiresAt: Date;
};

export interface PasswordResetTokenRepository {
  criar(input: CreatePasswordResetTokenInput): Promise<PasswordResetToken>;
  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>;
  markAsUsed(id: string): Promise<void>;
  invalidateAllFromUser(idUsuario: string): Promise<void>;
}
