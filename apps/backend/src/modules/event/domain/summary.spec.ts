import { summarize } from './summary';

describe('summarize', () => {
  it('keeps a short description, on one line', () => {
    expect(summarize('Kolem 8 km\npo Letné.\n\n  Tempo pohodové.')).toBe(
      'Kolem 8 km po Letné. Tempo pohodové.',
    );
  });

  it('is null without a description', () => {
    expect(summarize(null)).toBeNull();
    expect(summarize('  \n ')).toBeNull();
  });

  it('cuts a long one at a whole word, with „…“', () => {
    expect(summarize('Kolem osmi kilometrů po Letné a Stromovce', 25)).toBe(
      'Kolem osmi kilometrů po…',
    );
  });

  it('drops a comma or a dash before „…“', () => {
    expect(summarize('Běháme pomalu, kolem parku a zpátky', 15)).toBe(
      'Běháme pomalu…',
    );
  });

  it('cuts a single long word where it has to', () => {
    expect(summarize('a Nejnejnejnejnejdelšíslovo', 12)).toBe('a Nejnejnejn…');
  });
});
