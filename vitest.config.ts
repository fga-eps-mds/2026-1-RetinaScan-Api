import { defineConfig } from 'vitest/config';
import path from 'node:path';

const alias = { '@': path.resolve(import.meta.dirname, 'src') };

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    globals: true,
    reporters: [
      'default',
      ['vitest-sonar-reporter', { outputFile: './coverage/sonar-report.xml' }],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/types/**',
        'src/server.ts',
        'src/env.ts',
        'src/tests/**',
        '**/index.ts',
        'src/api/docs/**',
        'src/api/types/**',
        'src/infra/container/**',
        'src/infra/storage/**',
        'src/infra/auth/**',
        'src/infra/health/**',
        'src/infra/docs/**',
        'src/infra/queue/**',
        'src/infra/http/**',
        'src/infra/logger/**',
        'src/lib/**',
        'src/shared/services/auth-service.ts',
        'src/shared/services/cryptography-service.ts',
        'src/shared/services/masking-service.ts',
        'src/shared/services/message-broker.ts',
        'src/modules/**/*-repository.ts',
        'src/modules/exam/resultado-ia.ts',
        'src/infra/database/drizzle/connection.ts',
        'src/infra/database/drizzle/schema/**',
        'src/infra/database/drizzle/migrate.ts',
      ],
    },
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          globals: true,
          environment: 'node',
          include: ['src/tests/unit/**/*.test.ts'],
          typecheck: { tsconfig: './tsconfig.test.json' },
          sequence: { groupOrder: 0 },
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'integration',
          globals: true,
          environment: 'node',
          include: ['src/tests/integration/**/*.test.ts'],
          globalSetup: ['src/tests/integration/setup/global-setup.ts'],
          typecheck: { tsconfig: './tsconfig.test.json' },
          pool: 'forks',
          maxWorkers: 1,
          isolate: false,
          fileParallelism: false,
          sequence: { groupOrder: 1 },
        },
      },
    ],
  },
});
