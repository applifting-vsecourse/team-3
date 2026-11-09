import { foldText, matchesSearch, type SearchableEvent } from './event-search';

const event = (
  title: string,
  keywords: string[] = [],
  name = 'Florbal',
): SearchableEvent => ({
  title,
  activity: { name, keywords },
});

describe('foldText', () => {
  it('drops case and diacritics, joins dashes and spaces', () => {
    expect(foldText('  Frýdek-Místek  ')).toBe('frydek mistek');
    expect(foldText('Večerní   BĚH')).toBe('vecerni beh');
  });
});

describe('matchesSearch', () => {
  it('finds by the title without case and diacritics', () => {
    expect(matchesSearch(event('Večerní běh Letnou'), 'BEH letn')).toBe(true);
    expect(matchesSearch(event('Večerní běh Letnou'), 'kolo')).toBe(false);
  });

  it("finds by the activity's keywords and name", () => {
    expect(
      matchesSearch(event('Středeční hra', ['hokejka', 'unihockey']), 'hokejk'),
    ).toBe(true);
    expect(matchesSearch(event('Středeční hra'), 'florb')).toBe(true);
  });

  it('wants every word, each anywhere', () => {
    expect(matchesSearch(event('Florbal Chodov'), 'chodov florbal')).toBe(true);
    expect(matchesSearch(event('Florbal Chodov'), 'chodov tenis')).toBe(false);
  });

  it('matches everything without a query', () => {
    expect(matchesSearch(event('Cokoli'), '  ')).toBe(true);
  });
});
