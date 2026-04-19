export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions?: boolean;
}

export interface ChangeEmailInput {
  newEmail: string;
}

export interface AuthService {
  changePassword(input: ChangePasswordInput, headers: Headers): Promise<void>;
  changeEmail(input: ChangeEmailInput, headers: Headers): Promise<void>;
}
