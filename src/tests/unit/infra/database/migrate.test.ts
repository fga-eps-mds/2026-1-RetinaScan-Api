import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const poolEndMock = vi.fn();

  const poolInstance = {
    end: poolEndMock,
  };

  const PoolMock = vi.fn().mockImplementation(function () {
    return poolInstance;
  });

  const drizzleInstance = { __brand: 'mock-db' };

  const drizzleMock = vi.fn().mockReturnValue(drizzleInstance);
  const migrateMock = vi.fn();

  const errorMock = vi.fn();
  const exitMock = vi.fn();

  return {
    poolEndMock,
    poolInstance,
    PoolMock,
    drizzleInstance,
    drizzleMock,
    migrateMock,
    errorMock,
    exitMock,
  };
});

vi.mock('pg', () => ({
  Pool: mocks.PoolMock,
}));

vi.mock('drizzle-orm/node-postgres', () => ({
  drizzle: mocks.drizzleMock,
}));

vi.mock('drizzle-orm/node-postgres/migrator', () => ({
  migrate: mocks.migrateMock,
}));

vi.mock('@/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/retina-scan',
  },
}));

describe('migrate script', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    vi.spyOn(console, 'error').mockImplementation(mocks.errorMock);

    vi.spyOn(process, 'exit').mockImplementation(((code?: string | number | null) => {
      mocks.exitMock(code);
      throw new Error(`process.exit:${code ?? ''}`);
    }) as typeof process.exit);
  });

  it('should create pool, drizzle instance, run migrations and close pool', async () => {
    await import('@/infra/database/drizzle/migrate');

    await vi.waitFor(() => {
      expect(mocks.migrateMock).toHaveBeenCalledTimes(1);
    });

    expect(mocks.PoolMock).toHaveBeenCalledWith({
      connectionString: 'postgresql://postgres:postgres@localhost:5432/retina-scan',
    });
    expect(mocks.drizzleMock).toHaveBeenCalledTimes(1);
    expect(mocks.drizzleMock).toHaveBeenCalledWith(mocks.poolInstance);
    expect(mocks.migrateMock).toHaveBeenCalledWith(mocks.drizzleInstance, {
      migrationsFolder: './dist/infra/database/drizzle/migrations',
    });
    expect(mocks.poolEndMock).toHaveBeenCalledTimes(1);
    expect(mocks.errorMock).not.toHaveBeenCalled();
    expect(mocks.exitMock).not.toHaveBeenCalled();
  });

  it('should log error and exit with code 1 when migration fails', async () => {
    const migrationError = new Error('migration failed');
    mocks.migrateMock.mockRejectedValueOnce(migrationError);

    await import('@/infra/database/drizzle/migrate').catch(() => undefined);

    await vi.waitFor(() => {
      expect(mocks.errorMock).toHaveBeenCalledWith('Migration failed', migrationError);
    });

    expect(mocks.exitMock).toHaveBeenCalledWith(1);
    expect(mocks.poolEndMock).not.toHaveBeenCalled();
  });
});
