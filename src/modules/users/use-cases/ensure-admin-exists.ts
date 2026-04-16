import { eq } from 'drizzle-orm';

import logger from '@/infra/logger';
import { db } from '@/infra/database/drizzle/connection';
import { usuario } from '@/infra/database/drizzle/schema';
import { auth } from '@/lib/auth';
import { env } from '@/env';

export async function ensureAdminUserExists(): Promise<void> {
  try {
    /**
     * VALIDACAO ENV
     */
    if (
      !env.ADMIN_EMAIL ||
      !env.ADMIN_PASSWORD ||
      !env.ADMIN_NAME ||
      !env.ADMIN_BIRTH_DATE ||
      !env.ADMIN_CRM ||
      !env.ADMIN_CPF
    ) {
      logger.warn('Seed do admin ignorado: variáveis ADMIN_* ausentes.');

      return;
    }

    logger.info('Verificando se usuário administrador existe.', {
      email: env.ADMIN_EMAIL,
    });

    const existingAdmin = await db
      .select({
        idUsuario: usuario.id,
        email: usuario.email,
        tipoPerfil: usuario.tipoPerfil,
      })
      .from(usuario)
      .where(eq(usuario.email, env.ADMIN_EMAIL))
      .limit(1);

    if (!existingAdmin[0]) {
      logger.info('Administrador não encontrado. Criando conta.', {
        email: env.ADMIN_EMAIL,
      });

      await auth.api.signUpEmail({
        body: {
          name: env.ADMIN_NAME,
          email: env.ADMIN_EMAIL,
          password: env.ADMIN_PASSWORD,
          cpf: env.ADMIN_CPF,
          crm: env.ADMIN_CRM,
          dtNascimento: new Date(env.ADMIN_BIRTH_DATE).toString(),
        },
      });

      logger.info('Conta administrador criada com sucesso.', {
        email: env.ADMIN_EMAIL,
      });
    } else {
      logger.info('Administrador já existe.', {
        email: existingAdmin[0].email,
        tipoPerfil: existingAdmin[0].tipoPerfil,
      });
    }

    await db
      .update(usuario)
      .set({
        tipoPerfil: 'ADMIN',
        status: 'ATIVO',
      })
      .where(eq(usuario.email, env.ADMIN_EMAIL));

    logger.info('Perfil ADMIN garantido com sucesso.', {
      email: env.ADMIN_EMAIL,
    });
  } catch (error) {
    logger.error('Erro ao executar seed do administrador.', { error });
    console.log(error);
    throw error;
  }
}
