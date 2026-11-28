import { decideHomeChange, HOME_CHANGES_PER_DAY } from './home-change';

describe('decideHomeChange (#84)', () => {
  it('counts the changes of a Prague day', () => {
    expect(decideHomeChange({ day: null, count: 0 }, '2026-11-23')).toEqual({
      ok: true,
      next: { day: '2026-11-23', count: 1 },
    });
    expect(
      decideHomeChange({ day: '2026-11-23', count: 2 }, '2026-11-23'),
    ).toEqual({
      ok: true,
      next: { day: '2026-11-23', count: 3 },
    });
  });

  it('refuses a fourth change the same day', () => {
    expect(
      decideHomeChange(
        { day: '2026-11-23', count: HOME_CHANGES_PER_DAY },
        '2026-11-23',
      ),
    ).toEqual({ ok: false });
  });

  it('a new day starts from zero', () => {
    expect(
      decideHomeChange({ day: '2026-11-22', count: 3 }, '2026-11-23'),
    ).toEqual({
      ok: true,
      next: { day: '2026-11-23', count: 1 },
    });
  });
});
