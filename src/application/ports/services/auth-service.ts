export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  birthDate: Date;
  crm: string;
  cpf: string;
  identityNumber: string;
}

export interface IAuthService {
  signUp(input: SignUpInput): Promise<void>;
}
