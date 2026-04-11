import process from 'node:process';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  BUCKET_NAME: z.string().min(1, 'BUCKET_NAME is required'),
  ADMIN_NAME: z.string().min(1, 'ADMIN_NAME is required'),
  ADMIN_EMAIL: z
    .string()
    .email('ADMIN_EMAIL must be a valid email')
    .min(1, 'ADMIN_EMAIL is required'),
  ADMIN_PASSWORD: z
    .string()
    .min(8, 'ADMIN_PASSWORD must be at least 8 characters long')
    .min(1, 'ADMIN_PASSWORD is required'),
  ADMIN_BIRTH_DATE: z.string().min(1, 'ADMIN_BIRTH_DATE is required'),
  ADMIN_CRM: z.string().min(1, 'ADMIN_CRM is required'),
  ADMIN_CPF: z.string().min(1, 'ADMIN_CPF is required'),
  ADMIN_IDENTITY_NUMBER: z.string().min(1, 'ADMIN_IDENTITY_NUMBER is required'),
  BETTER_AUTH_SECRET: z.string().min(1, 'BETTER_AUTH_SECRET is required'),
  BETTER_AUTH_URL: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
