// src/tests/unit/api/routes/exam-routes-audit.test.ts

import { beforeAll, describe, expect, it } from 'vitest';
import fastify, { type FastifyInstance, type RouteOptions } from 'fastify';
import { examRoutes } from '@/api/routes/exams';

type AuditConfig = {
  enabled: boolean;
  action: string;
  category: string;
  getDescription?: (request: any, payload?: unknown) => unknown;
  getTarget?: (request: any, payload?: unknown) => unknown;
  getChanges?: (request: any, payload?: unknown) => unknown;
  getMetadata?: (request: any, payload?: unknown) => unknown;
};

function findRoute(routes: RouteOptions[], method: string, url: string): RouteOptions {
  const route = routes.find((item) => {
    const itemMethods = Array.isArray(item.method) ? item.method : [item.method];
    return item.url === url && itemMethods.includes(method as any);
  });

  if (!route) {
    throw new Error(`Route not found: ${method} ${url}`);
  }

  return route;
}

describe('examRoutes audit config', () => {
  let app: FastifyInstance;
  const registeredRoutes: RouteOptions[] = [];

  beforeAll(async () => {
    app = fastify();

    app.addHook('onRoute', (route) => {
      registeredRoutes.push(route);
    });

    await examRoutes(app);
    await app.ready();
  });

  it('should configure audit for POST /exams', () => {
    const route = findRoute(registeredRoutes, 'POST', '/exams');
    const audit = route.config?.audit as AuditConfig;

    expect(audit.enabled).toBe(true);
    expect(audit.action).toBe('CREATE');
    expect(audit.category).toBe('EXAM');

    const request = {
      user: { id: 'user-1' },
      body: {
        nomeCompleto: 'Paciente Teste',
        cpf: '12345678900',
        sexo: 'M',
        dtNascimento: '1990-01-01',
        dtHora: '2026-05-31T17:00:00.000Z',
        descricao: 'Exame de retina',
      },
    };

    const payload = {
      id: 'exam-1',
    };

    expect(audit.getDescription?.(request)).toBe('Usuário user-1 criou um novo exame');

    expect(audit.getTarget?.(request, payload)).toEqual({
      targetEntityType: 'EXAM',
      targetEntityId: 'exam-1',
      targetDisplay: 'exam-1',
    });

    expect(audit.getChanges?.(request)).toEqual({
      nomeCompleto: 'Paciente Teste',
      cpf: '12345678900',
      sexo: 'M',
      dtNascimento: '1990-01-01',
      dtHora: '2026-05-31T17:00:00.000Z',
      descricao: 'Exame de retina',
    });

    expect(audit.getMetadata?.(request)).toEqual({
      source: 'examRoutes.createExam',
    });
  });

  it('should keep webhook routes without audit config', () => {
    const webhookRoute = findRoute(registeredRoutes, 'POST', '/exams/:examId/webhook');
    const webhookErrorRoute = findRoute(registeredRoutes, 'POST', '/exams/:examId/webhook/error');

    expect(webhookRoute.config?.audit).toBeUndefined();
    expect(webhookErrorRoute.config?.audit).toBeUndefined();
  });

  it('should keep GET /exams without audit config', () => {
    const route = findRoute(registeredRoutes, 'GET', '/exams');
    expect(route.config?.audit).toBeUndefined();
  });

  it('should keep GET /exams/:examId without audit config', () => {
    const route = findRoute(registeredRoutes, 'GET', '/exams/:examId');
    expect(route.config?.audit).toBeUndefined();
  });
});
