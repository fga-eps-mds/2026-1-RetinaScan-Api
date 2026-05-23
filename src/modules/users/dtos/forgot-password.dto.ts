import { z } from 'zod';

export const forgotPasswordSchema = z
  .object({
    email: z.string().email('Email inválido.').optional(),
    crm: z.string().optional(),
  })
  .refine((data) => data.email || data.crm, {
    message: 'É obrigatório informar o e-mail ou o CRM.',
    path: ['email', 'crm'],
  });

export type ForgotPasswordDTO = z.infer<typeof forgotPasswordSchema>;
