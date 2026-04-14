import { env } from '@/env';
import pino, { type Logger as PinoLogger } from 'pino';

export type CategoryLogger = 'HTTP' | 'DB' | 'SYS' | 'CRIT';

export class Logger {
  private readonly root: PinoLogger;

  get pino(): PinoLogger {
    return this.root;
  }

  constructor() {
    this.root = pino({
      name: 'retina-scan-api',
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      // 1. Serializer: Essencial para parar de ver "error: {}"
      serializers: {
        err: pino.stdSerializers.err,
        error: pino.stdSerializers.err,
      },
      transport:
        env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    });
  }

  // 2. Melhoria na assinatura: Aceita erro ou objeto de dados
  public info(msg: string, data?: object): void {
    this.log('info', msg, data);
  }

  public debug(msg: string, data?: object): void {
    this.log('debug', msg, data);
  }

  public warn(msg: string, data?: object): void {
    this.log('warn', msg, data);
  }

  public error(msg: string, data?: unknown): void {
    // Se data for uma instância de Error, ele mapeia para a chave 'err' que o Pino entende
    if (data instanceof Error) {
      this.root.error({ err: data }, msg);
    } else {
      this.log('error', msg, data as object);
    }
  }

  public fatal(msg: string, data?: unknown): void {
    if (data instanceof Error) {
      this.root.fatal({ err: data }, msg);
    } else {
      this.log('fatal', msg, data as object);
    }
  }

  // 3. Método auxiliar para garantir a ordem correta dos argumentos do Pino
  private log(level: pino.Level, msg: string, data?: object): void {
    if (data) {
      this.root[level](data, msg);
    } else {
      this.root[level](msg);
    }
  }

  // 4. Helper para categorias sem precisar de cache complexo
  public category(cat: CategoryLogger) {
    return this.root.child({ category: cat });
  }
}

const logger = new Logger();
export default logger;
