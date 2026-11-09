import {
  mergeRanges,
  parseDbIpLine,
  townFor,
  type DbIpRow,
  type Town,
} from './ip-localities';

const towns: Town[] = [
  { slug: 'praha', name: 'Praha', lat: 50.0755, lng: 14.4378 },
  { slug: 'cernosice', name: 'Černošice', lat: 49.9601, lng: 14.3197 },
  { slug: 'brno', name: 'Brno', lat: 49.1951, lng: 16.6068 },
  {
    slug: 'stare-mesto-uh',
    name: 'Staré Město',
    lat: 49.0752,
    lng: 17.4334,
  },
  {
    slug: 'stare-mesto-br',
    name: 'Staré Město',
    lat: 50.1622,
    lng: 16.9474,
  },
];

const row = (city: string, lat: number, lng: number): DbIpRow => ({
  start: '01000000',
  end: '010000ff',
  country: 'CZ',
  city,
  lat,
  lng,
});

describe('parseDbIpLine', () => {
  it('reads plain and quoted fields', () => {
    expect(
      parseDbIpLine(
        '88.102.204.0,88.102.204.255,EU,CZ,Prague,"Prague (Praha 4)",50.0465,14.4565',
      ),
    ).toEqual({
      start: '88.102.204.0',
      end: '88.102.204.255',
      country: 'CZ',
      city: 'Prague (Praha 4)',
      lat: 50.0465,
      lng: 14.4565,
    });
  });

  it('keeps a comma inside quotes', () => {
    expect(parseDbIpLine('1.0.0.0,1.0.0.255,EU,CZ,X,"A, B",1,2')?.city).toBe(
      'A, B',
    );
  });

  it('rejects a line with the wrong number of fields', () => {
    expect(parseDbIpLine('1.0.0.0,1.0.0.255,EU')).toBeNull();
  });
});

describe('townFor', () => {
  it('puts Prague and its parts in Praha, even the outskirts nearer to another town', () => {
    expect(
      townFor(row('Stodůlky (Praha 5)', 50.0468, 14.3047), towns).slug,
    ).toBe('praha');
    expect(
      townFor(row('Jinonice (Prague)', 50.0698, 14.3778), towns).slug,
    ).toBe('praha');
  });

  it('keeps the districts around Prague out of Praha (Praha-západ, Praha-východ)', () => {
    expect(
      townFor(row('Černošice (Praha-západ)', 49.9601, 14.3197), towns).slug,
    ).toBe('cernosice');
    expect(
      townFor(row('Okolí (Praha-Východ)', 49.961, 14.32), towns).slug,
    ).toBe('cernosice');
    expect(
      townFor(row('Kunratice (Praha 4)', 50.0137, 14.4793), towns).slug,
    ).toBe('praha');
  });

  it('takes a town of the same name, ignoring diacritics', () => {
    expect(townFor(row('Cernosice', 49.96, 14.32), towns).slug).toBe(
      'cernosice',
    );
  });

  it('of two towns of the same name takes the one nearby', () => {
    expect(townFor(row('Staré Město', 50.16, 16.95), towns).slug).toBe(
      'stare-mesto-br',
    );
  });

  it('takes the nearest town for a place not in the catalog', () => {
    expect(townFor(row('Modřice', 49.1277, 16.6144), towns).slug).toBe('brno');
  });

  it('does not trust a same-named town far away', () => {
    expect(townFor(row('Brno', 49.97, 14.33), towns).slug).toBe('cernosice');
  });
});

describe('mergeRanges', () => {
  it('joins neighbouring ranges of one town', () => {
    expect(
      mergeRanges([
        { start: '01000000', end: '010000ff', slug: 'brno' },
        { start: '01000100', end: '010001ff', slug: 'brno' },
        { start: '01000200', end: '010002ff', slug: 'praha' },
        { start: '01000400', end: '010004ff', slug: 'praha' },
      ]),
    ).toEqual([
      { start: '01000000', end: '010001ff', slug: 'brno' },
      { start: '01000200', end: '010002ff', slug: 'praha' },
      { start: '01000400', end: '010004ff', slug: 'praha' },
    ]);
  });
});
