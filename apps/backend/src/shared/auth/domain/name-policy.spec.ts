import { FALLBACK_NAME, nameProblem, toValidName } from './name-policy';

describe('nameProblem (#153)', () => {
  it('accepts names with diacritics, a hyphen, an apostrophe and a dot', () => {
    for (const name of [
      'Jo',
      'Jana Malá',
      'Žofie Řeháková-Štěpánková',
      "Seán O'Connor",
      'D’Artagnan',
      'J. R. R. Tolkien',
      'Zoë Ångström',
      'Ольга',
      // é typed as e + a combining accent
      'Renée',
      'a'.repeat(60),
    ]) {
      expect(nameProblem(name)).toBeNull();
    }
  });

  it('names the character that does not belong', () => {
    expect(nameProblem('Jana <script>')).toBe(
      'Znak „<“ do jména nepatří. Jméno může obsahovat jen písmena, mezery, pomlčky, apostrofy a tečky.',
    );
    expect(nameProblem('Jana > Petr')).toMatch(/^Znak „>“/);
    expect(nameProblem('Petr2')).toMatch(/^Znak „2“/);
    expect(nameProblem('Jana 😀')).toMatch(/^Znak „😀“/);
    expect(nameProblem('Jana_Malá')).toMatch(/^Znak „_“/);
  });

  it('refuses control and invisible characters without quoting them', () => {
    for (const name of [
      'Jana\nMalá',
      'Jana\tMalá',
      'Jana\u0000',
      'Jana‍Malá',
      'Jana Malá',
    ]) {
      expect(nameProblem(name)).toMatch(/^Jméno obsahuje neviditelný znak/);
    }
  });

  it('wants 2 to 60 characters, not counting the spaces around', () => {
    expect(nameProblem('')).toBe('Jméno musí mít aspoň 2 znaky.');
    expect(nameProblem(' J ')).toBe('Jméno musí mít aspoň 2 znaky.');
    expect(nameProblem('a'.repeat(61))).toBe('Jméno může mít nejvýš 60 znaků.');
    // characters, not UTF-16 units: 60 letters with a háček are fine
    expect(nameProblem('ř'.repeat(60))).toBeNull();
  });

  it('wants a letter, not just punctuation', () => {
    expect(nameProblem('--')).toBe('Jméno musí obsahovat aspoň jedno písmeno.');
    expect(nameProblem(". '")).toBe(
      'Jméno musí obsahovat aspoň jedno písmeno.',
    );
  });
});

describe('toValidName (#154)', () => {
  it('keeps a name that passes as it is', () => {
    expect(toValidName('Žofie Řeháková-Štěpánková')).toBe(
      'Žofie Řeháková-Štěpánková',
    );
  });

  it("leaves out what doesn't belong in a name and cuts it to 60 characters", () => {
    expect(toValidName('Jan Novák 2')).toBe('Jan Novák');
    expect(toValidName('Jana 😀 Malá')).toBe('Jana Malá');
    expect(toValidName(`${'a'.repeat(59)} Novák`)).toBe('a'.repeat(59));
    expect(nameProblem(toValidName('<b>Petr</b>'))).toBeNull();
  });

  it('falls back to „Bez jména“ when nothing usable is left', () => {
    expect(toValidName('12345')).toBe(FALLBACK_NAME);
    expect(toValidName('😀')).toBe(FALLBACK_NAME);
    expect(toValidName(undefined)).toBe(FALLBACK_NAME);
    expect(nameProblem(FALLBACK_NAME)).toBeNull();
  });
});
