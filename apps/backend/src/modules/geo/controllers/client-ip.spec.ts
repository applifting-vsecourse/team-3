import type { AddressInfo } from 'node:net';
import * as express from 'express';
import { clientIp } from './client-ip';

/** What clientIp reports for one request to a real Express app with `trust proxy` set as in main.ts. */
async function ipSeen(
  trustProxyHops: number,
  forwardedFor?: string,
): Promise<string | undefined> {
  const app = express();
  if (trustProxyHops > 0) app.set('trust proxy', trustProxyHops);
  app.get('/', (request, response) => {
    response.json({ ip: clientIp(request) ?? null });
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/`, {
      headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {},
    });
    const body = (await response.json()) as { ip: string | null };
    return body.ip ?? undefined;
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

describe('clientIp', () => {
  it('behind one proxy: the address the proxy added, not one the client wrote before it', async () => {
    // the client sent „X-Forwarded-For: 37.48.50.1“ itself, the proxy appended the real one
    await expect(ipSeen(1, '37.48.50.1, 88.102.204.10')).resolves.toBe(
      '88.102.204.10',
    );
  });

  it('behind one proxy: the visitor when nobody faked the header', async () => {
    await expect(ipSeen(1, '88.102.204.10')).resolves.toBe('88.102.204.10');
  });

  it('without a trusted proxy: the connection, X-Forwarded-For is ignored', async () => {
    await expect(ipSeen(0, '37.48.50.1')).resolves.toBe('127.0.0.1');
  });

  it('falls back to the socket when Express has no ip', () => {
    expect(clientIp({ socket: { remoteAddress: '::1' } })).toBe('::1');
  });
});
