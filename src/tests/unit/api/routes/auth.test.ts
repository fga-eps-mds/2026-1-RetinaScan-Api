import Fastify, { type FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authRoutes } from '@/api/routes/auth';

const { authHandlerMock } = vi.hoisted(() => ({
  authHandlerMock: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    handler: authHandlerMock,
  },
}));

describe('authRoutes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(authRoutes);
    await app.ready();
  });

  it('should proxy GET /auth/* to auth.handler', async () => {
    authHandlerMock.mockResolvedValue(
      new Response('ok-get', {
        status: 200,
        headers: {
          'content-type': 'text/plain',
          'x-test': '123',
        },
      }),
    );

    const res = await app.inject({
      method: 'GET',
      url: '/auth/session?foo=bar',
      headers: {
        host: 'localhost:3000',
        cookie: 'session=abc',
      },
    });

    expect(authHandlerMock).toHaveBeenCalledTimes(1);

    const req = authHandlerMock.mock.calls[0][0] as Request;

    expect(req).toBeInstanceOf(Request);
    expect(req.method).toBe('GET');
    expect(req.url).toBe('http://localhost:3000/auth/session?foo=bar');
    expect(req.headers.get('cookie')).toBe('session=abc');

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.headers['x-test']).toBe('123');
    expect(res.body).toBe('ok-get');
  });

  it('should proxy POST body to auth.handler', async () => {
    authHandlerMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 201,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );

    const payload = {
      email: 'gustavo@email.com',
      password: '123456',
    };

    const res = await app.inject({
      method: 'POST',
      url: '/auth/sign-in',
      headers: {
        host: 'localhost:3000',
        'content-type': 'application/json',
      },
      payload,
    });

    expect(authHandlerMock).toHaveBeenCalledTimes(1);

    const req = authHandlerMock.mock.calls[0][0] as Request;

    expect(req.method).toBe('POST');
    expect(req.url).toBe('http://localhost:3000/auth/sign-in');
    expect(req.headers.get('content-type')).toContain('application/json');
    await expect(req.text()).resolves.toBe(JSON.stringify(payload));

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ success: true });
  });

  it('should send null when response body is empty', async () => {
    authHandlerMock.mockResolvedValue(
      new Response(null, {
        status: 204,
      }),
    );

    const res = await app.inject({
      method: 'GET',
      url: '/auth/sign-out',
      headers: {
        host: 'localhost:3000',
      },
    });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe('');
  });
});
