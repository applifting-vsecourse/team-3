import type { Request, Response } from 'express';
import { securityHeaders } from './security-headers';

const headersSet = (): Record<string, string> => {
  const headers: Record<string, string> = {};
  const res = {
    setHeader: (name: string, value: string) => {
      headers[name.toLowerCase()] = value;
    },
    removeHeader: jest.fn(),
  } as unknown as Response;
  securityHeaders()({} as Request, res, jest.fn());
  return headers;
};

describe('securityHeaders', () => {
  it('refuses framing and sniffing, and keeps HSTS to this host', () => {
    const headers = headersSet();

    expect(headers['content-security-policy']).toBe("frame-ancestors 'none'");
    expect(headers['x-frame-options']).toBeDefined();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['strict-transport-security']).toBe('max-age=31536000');
  });

  it('restricts no scripts, which the Swagger UI needs inline', () => {
    expect(headersSet()['content-security-policy']).not.toContain('script-src');
  });
});
