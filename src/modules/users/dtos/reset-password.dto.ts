import { z } from 'zod';

export const resetPasswordSchema = z
  .object({
    token: z.string({ required_error: 'O token é obrigatório.' }),
    password: z.string().min(8, 'A nova senha deve conter pelo menos 8 dígitos.'),
    confirmPassword: z.string().min(8, 'A confirmação de senha deve conter pelo menos 8 dígitos.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  });

export type ResetPasswordDTO = z.infer<typeof resetPasswordSchema>;
