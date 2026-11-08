import { ipToHex } from './ip-address';

describe('ipToHex', () => {
  it('writes IPv4 as 8 hex digits', () => {
    expect(ipToHex('1.2.3.4')).toBe('01020304');
    expect(ipToHex('255.255.255.255')).toBe('ffffffff');
  });

  it('treats an IPv4-mapped IPv6 address as IPv4', () => {
    expect(ipToHex('::ffff:88.102.204.10')).toBe('5866cc0a');
    expect(ipToHex('::FFFF:1.2.3.4')).toBe('01020304');
    expect(ipToHex('0:0:0:0:0:ffff:88.102.204.10')).toBe('5866cc0a');
    expect(ipToHex('::ffff:5866:cc0a')).toBe('5866cc0a');
  });

  it('expands IPv6 to 32 hex digits', () => {
    expect(ipToHex('2a02:8309:1184::')).toBe(
      '2a028309118400000000000000000000',
    );
    expect(ipToHex('2001:db8::1')).toBe('20010db8000000000000000000000001');
    expect(ipToHex('::1')).toBe('00000000000000000000000000000001');
    expect(ipToHex('2001:DB8:0:0:0:0:0:Ff')).toBe(
      '20010db80000000000000000000000ff',
    );
  });

  it('expands an IPv6 address with an IPv4 tail', () => {
    expect(ipToHex('64:ff9b::1.2.3.4')).toBe(
      '0064ff9b000000000000000001020304',
    );
  });

  it('rejects what is not an address', () => {
    expect(ipToHex('')).toBeNull();
    expect(ipToHex('unknown')).toBeNull();
    expect(ipToHex('1.2.3.256')).toBeNull();
  });
});
