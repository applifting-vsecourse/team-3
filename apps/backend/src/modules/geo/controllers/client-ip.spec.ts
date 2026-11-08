import { clientIp } from './client-ip';

describe('clientIp', () => {
  it('takes the first X-Forwarded-For entry behind the proxy', () => {
    expect(
      clientIp({
        headers: { 'x-forwarded-for': '88.102.204.10, 10.0.0.2' },
        socket: { remoteAddress: '10.0.0.3' },
      }),
    ).toBe('88.102.204.10');
  });

  it('takes the socket without a proxy', () => {
    expect(clientIp({ headers: {}, socket: { remoteAddress: '::1' } })).toBe(
      '::1',
    );
  });
});
