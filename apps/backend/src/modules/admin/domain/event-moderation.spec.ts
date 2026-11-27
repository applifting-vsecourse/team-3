import {
  decideHide,
  decideUnhide,
  MODERATION_REASON_MAX_LENGTH,
  moderationReason,
} from './event-moderation';

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

describe('moderationReason (#308, review #380)', () => {
  it('is trimmed', () => {
    expect(moderationReason('  Podvod \n')).toEqual({
      ok: true,
      reason: 'Podvod',
    });
  });

  it('blanks are no reason', () => {
    for (const raw of ['', '   ', '\n\t ']) {
      expect(moderationReason(raw)).toEqual({
        ok: false,
        refusal: 'REASON_REQUIRED',
      });
    }
  });

  it(`at most ${MODERATION_REASON_MAX_LENGTH} characters, counted after trimming`, () => {
    const longest = 'x'.repeat(MODERATION_REASON_MAX_LENGTH);
    expect(moderationReason(`  ${longest}  `)).toEqual({
      ok: true,
      reason: longest,
    });
    expect(moderationReason(`${longest}x`)).toEqual({
      ok: false,
      refusal: 'REASON_TOO_LONG',
    });
  });
});
