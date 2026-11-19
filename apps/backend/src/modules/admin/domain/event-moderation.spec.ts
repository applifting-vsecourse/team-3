import { decideHide, decideUnhide } from './event-moderation';

describe('decideHide (#308)', () => {
  it('a published event can be deactivated', () => {
    expect(decideHide('published')).toEqual({ ok: true });
  });

  it('a cancelled event cannot: cancelling stays', () => {
    expect(decideHide('cancelled')).toEqual({
      ok: false,
      refusal: 'EVENT_CANCELLED',
    });
  });

  it('a deactivated event is not deactivated twice', () => {
    expect(decideHide('hidden')).toEqual({
      ok: false,
      refusal: 'EVENT_ALREADY_HIDDEN',
    });
  });
});

describe('decideUnhide (#308)', () => {
  it('only a deactivated event can be restored', () => {
    expect(decideUnhide('hidden')).toEqual({ ok: true });
    for (const status of ['published', 'cancelled'] as const) {
      expect(decideUnhide(status)).toEqual({
        ok: false,
        refusal: 'EVENT_NOT_HIDDEN',
      });
    }
  });
});
