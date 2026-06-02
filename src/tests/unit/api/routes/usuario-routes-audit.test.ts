// src/tests/unit/api/routes/usuario-routes-audit.test.ts

import { beforeAll, describe, expect, it } from 'vitest';
import fastify, { type FastifyInstance, type RouteOptions } from 'fastify';
import { usuarioRoutes } from '@/api/routes/usuarios';

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

describe('usuarioRoutes audit config', () => {
  let app: FastifyInstance;
  const registeredRoutes: RouteOptions[] = [];

  beforeAll(async () => {
    app = fastify();

    app.addHook('onRoute', (route) => {
      registeredRoutes.push(route);
    });

    await usuarioRoutes(app);
    await app.ready();
  });

  it('should configure audit for POST /usuarios', () => {
    const route = findRoute(registeredRoutes, 'POST', '/usuarios');
    const audit = route.config?.audit as AuditConfig;

    expect(audit.enabled).toBe(true);
    expect(audit.action).toBe('CREATE');
    expect(audit.category).toBe('USER_MANAGEMENT');

    const request = {
      user: { email: 'admin@teste.com' },
      body: {
        nomeCompleto: 'Gustavo Costa',
        email: 'gustavo@teste.com',
        cpf: '12345678900',
        crm: 'CRM-123',
        dtNascimento: '1990-01-01',
        tipoPerfil: 'MEDICO',
      },
    };

    expect(audit.getDescription?.(request)).toBe('Admin admin@teste.com criou um novo usuário');

    expect(audit.getTarget?.(request)).toEqual({
      targetEntityType: 'USER',
      targetEntityId: 'gustavo@teste.com',
      targetDisplay: 'gustavo@teste.com',
    });

    expect(audit.getChanges?.(request)).toEqual({
      nomeCompleto: 'Gustavo Costa',
      email: 'gustavo@teste.com',
      cpf: '123***',
      crm: 'CRM-123',
      dtNascimento: '1990-01-01',
      tipoPerfil: 'MEDICO',
    });

    expect(audit.getMetadata?.(request)).toEqual({
      source: 'usuarioRoutes.createUserByAdmin',
    });
  });

  it('should configure audit for PUT /usuarios', () => {
    const route = findRoute(registeredRoutes, 'PUT', '/usuarios');
    const audit = route.config?.audit as AuditConfig;

    expect(audit.enabled).toBe(true);
    expect(audit.action).toBe('UPDATE');
    expect(audit.category).toBe('USER_MANAGEMENT');

    const request = {
      user: {
        id: 'user-1',
        email: 'medico@teste.com',
      },
      body: {
        senhaAtual: '123456',
        novaSenha: '654321',
      },
    };

    const payload = {
      usuario: {
        nomeCompleto: 'Dr. Gustavo',
        email: 'medico@teste.com',
        dtNascimento: '1990-01-01',
      },
    };

    expect(audit.getDescription?.(request)).toBe('Usuário user-1 atualizou seu perfil');

    expect(audit.getTarget?.(request)).toEqual({
      targetEntityType: 'USER',
      targetEntityId: 'user-1',
      targetDisplay: 'medico@teste.com',
    });

    expect(audit.getChanges?.(request, payload)).toEqual({
      nomeCompleto: 'Dr. Gustavo',
      email: 'medico@teste.com',
      dtNascimento: '1990-01-01',
    });

    expect(audit.getMetadata?.(request)).toEqual({
      source: 'usuarioRoutes.updateUserRoute',
      changedPassword: true,
    });
  });

  it('should configure audit for PATCH /usuarios/imagem', () => {
    const route = findRoute(registeredRoutes, 'PATCH', '/usuarios/imagem');
    const audit = route.config?.audit as AuditConfig;

    const request = {
      user: {
        id: 'user-1',
        email: 'medico@teste.com',
      },
    };

    const payload = {
      url: 'https://cdn.teste.com/profile.png',
    };

    expect(audit.enabled).toBe(true);
    expect(audit.action).toBe('UPDATE_IMAGE');
    expect(audit.category).toBe('USER_MANAGEMENT');

    expect(audit.getDescription?.(request)).toBe('Usuário user-1 atualizou sua imagem de perfil');

    expect(audit.getTarget?.(request)).toEqual({
      targetEntityType: 'USER',
      targetEntityId: 'user-1',
      targetDisplay: 'medico@teste.com',
    });

    expect(audit.getChanges?.(request, payload)).toEqual({
      imageUrl: 'https://cdn.teste.com/profile.png',
    });

    expect(audit.getMetadata?.(request)).toEqual({
      source: 'usuarioRoutes.updateUserImageRoute',
    });
  });

  it('should configure audit for POST /usuarios/solicitacoes-cpf-crm', () => {
    const route = findRoute(registeredRoutes, 'POST', '/usuarios/solicitacoes-cpf-crm');
    const audit = route.config?.audit as AuditConfig;

    const request = {
      user: {
        id: 'user-1',
        email: 'medico@teste.com',
      },
      body: {
        cpfNovo: '12345678900',
        crmNovo: 'CRM-999',
      },
    };

    expect(audit.enabled).toBe(true);
    expect(audit.action).toBe('REQUEST_CHANGE');
    expect(audit.category).toBe('USER_MANAGEMENT');

    expect(audit.getDescription?.(request)).toBe('Usuário user-1 solicitou alteração de CPF/CRM');

    expect(audit.getTarget?.(request)).toEqual({
      targetEntityType: 'USER',
      targetEntityId: 'user-1',
      targetDisplay: 'medico@teste.com',
    });

    expect(audit.getChanges?.(request)).toEqual({
      cpfNovo: '123***',
      crmNovo: 'CRM-999',
    });

    expect(audit.getMetadata?.(request)).toEqual({
      source: 'usuarioRoutes.solicitarAlteracaoCpfCrmRoute',
      requestedFields: ['cpfNovo', 'crmNovo'],
    });
  });

  it('should configure audit for PATCH /usuarios/solicitacoes-cpf-crm/:id/aprovar on success', () => {
    const route = findRoute(
      registeredRoutes,
      'PATCH',
      '/usuarios/solicitacoes-cpf-crm/:id/aprovar',
    );
    const audit = route.config?.audit as AuditConfig;

    const request = {
      user: { email: 'admin@teste.com' },
      params: { id: 'sol-1' },
    };

    const payload = {
      solicitacao: { id: 'sol-1', status: 'APROVADA' },
      notificacaoEnviada: true,
      message: 'ok',
    };

    expect(audit.enabled).toBe(true);
    expect(audit.action).toBe('APPROVE');
    expect(audit.category).toBe('USER_MANAGEMENT');

    expect(audit.getDescription?.(request, payload)).toBe(
      'Solicitação de CPF/CRM sol-1 aprovada por admin admin@teste.com',
    );

    expect(audit.getTarget?.(request)).toEqual({
      targetEntityType: 'SOLICITATION',
      targetEntityId: 'sol-1',
      targetDisplay: 'sol-1',
    });

    expect(audit.getChanges?.(request, payload)).toEqual({
      solicitacao: { id: 'sol-1', status: 'APROVADA' },
      notificacaoEnviada: true,
    });

    expect(audit.getMetadata?.(request, payload)).toEqual({
      source: 'usuarioRoutes.aprovarSolicitacaoCpfCrmRoute',
      idSolicitacao: 'sol-1',
      statusCode: null,
      error: null,
      message: 'ok',
    });
  });

  it('should configure audit for PATCH /usuarios/solicitacoes-cpf-crm/:id/aprovar on failure', () => {
    const route = findRoute(
      registeredRoutes,
      'PATCH',
      '/usuarios/solicitacoes-cpf-crm/:id/aprovar',
    );
    const audit = route.config?.audit as AuditConfig;

    const request = {
      user: { email: 'admin@teste.com' },
      params: { id: 'sol-2' },
    };

    const payload = {
      statusCode: 400,
      error: 'BadRequest',
      message: 'Solicitação inválida',
    };

    expect(audit.getDescription?.(request, payload)).toBe(
      'Falha ao aprovar solicitação de CPF/CRM sol-2',
    );

    expect(audit.getMetadata?.(request, payload)).toEqual({
      source: 'usuarioRoutes.aprovarSolicitacaoCpfCrmRoute',
      idSolicitacao: 'sol-2',
      statusCode: 400,
      error: 'BadRequest',
      message: 'Solicitação inválida',
    });
  });

  it('should configure audit for PATCH /usuarios/solicitacoes-cpf-crm/:id/rejeitar', () => {
    const route = findRoute(
      registeredRoutes,
      'PATCH',
      '/usuarios/solicitacoes-cpf-crm/:id/rejeitar',
    );
    const audit = route.config?.audit as AuditConfig;

    const request = {
      user: { email: 'admin@teste.com' },
      params: { id: 'sol-3' },
      body: { motivoRejeicao: 'Documento inválido' },
    };

    const payload = {
      solicitacao: {
        id: 'sol-3',
        status: 'REJEITADA',
      },
    };

    expect(audit.enabled).toBe(true);
    expect(audit.action).toBe('REJECT');
    expect(audit.category).toBe('USER_MANAGEMENT');

    expect(audit.getDescription?.(request)).toBe(
      'Solicitação de CPF/CRM sol-3 rejeitada por admin admin@teste.com',
    );

    expect(audit.getTarget?.(request)).toEqual({
      targetEntityType: 'SOLICITATION',
      targetEntityId: 'sol-3',
      targetDisplay: 'sol-3',
    });

    expect(audit.getChanges?.(request, payload)).toEqual({
      solicitacao: {
        id: 'sol-3',
        status: 'REJEITADA',
      },
      motivoRejeicao: 'Documento inválido',
    });

    expect(audit.getMetadata?.(request)).toEqual({
      source: 'usuarioRoutes.rejeitarSolicitacaoCpfCrmRoute',
      idSolicitacao: 'sol-3',
    });
  });
});
