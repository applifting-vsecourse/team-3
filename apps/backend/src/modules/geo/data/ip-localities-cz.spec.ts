import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IpLocalityTable } from '@/modules/geo/domain/ip-locality-table';
import { isCoarseRange } from '@/scripts/geo/ip-localities';

/** The committed table, as GeoModule loads it. */
const text = readFileSync(join(__dirname, 'ip-localities-cz.txt'), 'utf8');
const ranges = text
  .split('\n')
  .filter((line) => line.trim() !== '' && !line.startsWith('#'))
  .map((line) => {
    const [start, end] = line.split(' ');
    return { start, end };
  });

describe('ip-localities-cz.txt (#299)', () => {
  it('has no range too wide to say a town', () => {
    expect(ranges.filter((range) => isCoarseRange(range))).toEqual([]);
  });

  it('guesses nothing for a provider-wide IPv6 block that all went to Police nad Metují', () => {
    const table = new IpLocalityTable(text);
    expect(table.slugFor('2a07:bc0::1')).toBeUndefined();
    expect(table.slugFor('2a07:bc5:1234::1')).toBeUndefined();
  });

  it('still guesses a narrow range', () => {
    const table = new IpLocalityTable(text);
    expect(table.slugFor('2001:67c:2f18::1')).toBe('police-nad-metuji');
  });
});
