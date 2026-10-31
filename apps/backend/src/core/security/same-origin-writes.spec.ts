import type { NextFunction, Request, Response } from 'express';
import { sameOriginWrites } from './same-origin-writes';

const guard = sameOriginWrites([
  'https://team-3.vsepractical.applifting.dev/',
  'http://localhost:4050',
]);

const run = (
  method: string,
  path: string,
  origin?: string,
): { passed: boolean; status?: number; body?: unknown } => {
  let status: number | undefined;
  let body: unknown;
  const res = {
    status: (code: number) => {
      status = code;
      return res;
    },
    json: (payload: unknown) => {
      body = payload;
      return res;
    },
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  guard(
    { method, path, headers: origin ? { origin } : {} } as Request,
    res,
    next,
  );
  return { passed: (next as jest.Mock).mock.calls.length === 1, status, body };
};

describe('sameOriginWrites', () => {
  it('lets the app write from its own origin (trailing slash in the config is fine)', () => {
    expect(
      run(
        'POST',
        '/api/events/e1/participation',
        'https://team-3.vsepractical.applifting.dev',
      ).passed,
    ).toBe(true);
    expect(run('PATCH', '/api/events/e1', 'http://localhost:4050').passed).toBe(
      true,
    );
  });

  it('refuses a write from another app on the same site (a sibling subdomain) with 403', () => {
    const result = run(
      'POST',
      '/api/groups/g1/deactivate',
      'https://team-9.vsepractical.applifting.dev',
    );

    expect(result.passed).toBe(false);
    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({ code: 'FOREIGN_ORIGIN' });
  });

  it('refuses a write without an Origin (browsers always send one with a write)', () => {
    expect(run('DELETE', '/api/events/e1/participation').status).toBe(403);
    expect(run('POST', '/api/events', 'null').status).toBe(403);
  });

  it('reads stay open, and BetterAuth checks /api/auth itself', () => {
    expect(run('GET', '/api/events').passed).toBe(true);
    expect(
      run('OPTIONS', '/api/events', 'https://elsewhere.example').passed,
    ).toBe(true);
    expect(
      run('POST', '/api/auth/sign-in/email', 'https://elsewhere.example')
        .passed,
    ).toBe(true);
  });
});
