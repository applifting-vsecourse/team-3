import { IpLocalityTable } from './ip-locality-table';

const table = new IpLocalityTable(
  [
    '# DB-IP test',
    '05000000 050000ff praha',
    '05000100 050001ff brno',
    '',
    '2a020000000000000000000000000000 2a02ffffffffffffffffffffffffffff ostrava',
  ].join('\n'),
);

describe('IpLocalityTable', () => {
  it('finds the town of an address inside a range, edges included', () => {
    expect(table.slugFor('5.0.0.0')).toBe('praha');
    expect(table.slugFor('5.0.0.128')).toBe('praha');
    expect(table.slugFor('5.0.1.255')).toBe('brno');
    expect(table.slugFor('::ffff:5.0.1.1')).toBe('brno');
    expect(table.slugFor('2a02:1::5')).toBe('ostrava');
  });

  it('knows nothing outside the ranges', () => {
    expect(table.slugFor('4.255.255.255')).toBeUndefined();
    expect(table.slugFor('5.0.2.0')).toBeUndefined();
    expect(table.slugFor('127.0.0.1')).toBeUndefined();
    expect(table.slugFor('::1')).toBeUndefined();
    expect(table.slugFor('2a03::1')).toBeUndefined();
  });

  it('knows nothing for what is not an address', () => {
    expect(table.slugFor('unknown')).toBeUndefined();
  });
});
