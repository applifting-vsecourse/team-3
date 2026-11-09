import { isIPv4, isIPv6 } from 'node:net';

/**
 * An IP address as fixed-width hex: 8 digits for IPv4, 32 for IPv6. Same
 * width means string order is numeric order, so ranges sort and compare as
 * plain strings. An IPv4-mapped IPv6 address (`::ffff:1.2.3.4`, what Node
 * reports for IPv4 clients on a dual-stack socket) counts as IPv4.
 */
export function ipToHex(ip: string): string | null {
  const address = ip.trim();
  if (isIPv4(address)) return ipv4ToHex(address);
  if (!isIPv6(address)) return null;

  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped) return ipv4ToHex(mapped[1]);

  // An IPv4 tail („::1.2.3.4“) as two groups of hex
  const tail = /(\d+\.\d+\.\d+\.\d+)$/.exec(address);
  const withoutTail = tail
    ? address.slice(0, -tail[1].length) +
      ipv4ToHex(tail[1]).replace(/^(.{4})(.{4})$/, '$1:$2')
    : address;

  const [head, rest] = withoutTail.split('::');
  const headGroups = head ? head.split(':') : [];
  const restGroups = rest ? rest.split(':') : [];
  const missing = 8 - headGroups.length - restGroups.length;
  const groups =
    rest === undefined
      ? headGroups
      : [...headGroups, ...Array<string>(missing).fill('0'), ...restGroups];
  const hex = groups
    .map((group) => group.padStart(4, '0').toLowerCase())
    .join('');
  // IPv4-mapped written out in full („0:0:0:0:0:ffff:1.2.3.4“): IPv4 too (review #274)
  return hex.startsWith(IPV4_MAPPED_PREFIX)
    ? hex.slice(IPV4_MAPPED_PREFIX.length)
    : hex;
}

/** ::ffff:0:0/96 as hex: the first 24 of the 32 digits. */
const IPV4_MAPPED_PREFIX = '00000000000000000000ffff';

function ipv4ToHex(ip: string): string {
  return ip
    .split('.')
    .map((octet) => Number(octet).toString(16).padStart(2, '0'))
    .join('');
}
