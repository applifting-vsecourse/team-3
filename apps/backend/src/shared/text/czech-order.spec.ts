import { byCzechName, compareCzech } from '@/shared/text/czech-order';

describe('Czech order (#370)', () => {
  const names = (list: string[]): string[] =>
    byCzechName(list.map((name) => ({ name }))).map(({ name }) => name);

  it('puts the letters with a háček where the Czech alphabet has them', () => {
    expect(
      names([
        'Zlínští deskovkáři',
        'Šachisti z Ústí nad Labem',
        'Tenisté',
        'Sokolové',
        'Dámy',
        'Čtenáři',
        'Cyklisté',
      ]),
    ).toEqual([
      'Cyklisté',
      'Čtenáři',
      'Dámy',
      'Sokolové',
      'Šachisti z Ústí nad Labem',
      'Tenisté',
      'Zlínští deskovkáři',
    ]);
  });

  it('a vowel with a mark sorts as the vowel: „Bě“ before „Br“', () => {
    expect(names(['Brněnští volejbalisti', 'Běžci od Boleváku'])).toEqual([
      'Běžci od Boleváku',
      'Brněnští volejbalisti',
    ]);
  });

  it('„Ch“ is a letter of its own, after H', () => {
    expect(compareCzech('Chodci', 'Hokej')).toBeGreaterThan(0);
    expect(compareCzech('Chodci', 'Ivana')).toBeLessThan(0);
  });

  it('leaves the input as it was', () => {
    const list = [{ name: 'B' }, { name: 'A' }];
    byCzechName(list);
    expect(list.map(({ name }) => name)).toEqual(['B', 'A']);
  });
});
