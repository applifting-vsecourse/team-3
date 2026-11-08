import { foldText } from './fold-text';

describe('foldText', () => {
  it('drops diacritics and case', () => {
    expect(foldText('Ústí nad Orlicí')).toBe('usti nad orlici');
    expect(foldText('PLZEŇ')).toBe('plzen');
  });
});
