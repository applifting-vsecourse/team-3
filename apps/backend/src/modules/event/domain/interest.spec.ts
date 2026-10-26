import { rankByInterest } from './interest';

const at = (iso: string): Date => new Date(iso);

describe('rankByInterest', () => {
  it('puts the most interest first, whatever the date', () => {
    const events = [
      { id: 'soon-quiet', startsAt: at('2026-10-27T16:00:00.000Z') },
      { id: 'later-busy', startsAt: at('2026-11-20T16:00:00.000Z') },
      { id: 'middle', startsAt: at('2026-11-02T16:00:00.000Z') },
    ];
    const interest = new Map([
      ['soon-quiet', 1],
      ['later-busy', 9],
      ['middle', 4],
    ]);

    expect(rankByInterest(events, interest).map((e) => e.id)).toEqual([
      'later-busy',
      'middle',
      'soon-quiet',
    ]);
  });

  it('with equal interest the soonest comes first, then the id decides', () => {
    const events = [
      { id: 'b-later', startsAt: at('2026-11-20T16:00:00.000Z') },
      { id: 'c-soon', startsAt: at('2026-10-27T16:00:00.000Z') },
      { id: 'a-soon', startsAt: at('2026-10-27T16:00:00.000Z') },
    ];
    const interest = new Map([
      ['b-later', 3],
      ['c-soon', 3],
      ['a-soon', 3],
    ]);

    expect(rankByInterest(events, interest).map((e) => e.id)).toEqual([
      'a-soon',
      'c-soon',
      'b-later',
    ]);
  });

  it('an event nobody is interested in yet counts as zero and goes last', () => {
    const events = [
      { id: 'nobody', startsAt: at('2026-10-27T16:00:00.000Z') },
      { id: 'one', startsAt: at('2026-11-20T16:00:00.000Z') },
    ];

    expect(
      rankByInterest(events, new Map([['one', 1]])).map((e) => e.id),
    ).toEqual(['one', 'nobody']);
  });

  it('leaves the given list as it was', () => {
    const events = [
      { id: 'quiet', startsAt: at('2026-10-27T16:00:00.000Z') },
      { id: 'busy', startsAt: at('2026-11-20T16:00:00.000Z') },
    ];

    rankByInterest(events, new Map([['busy', 5]]));

    expect(events.map((e) => e.id)).toEqual(['quiet', 'busy']);
  });
});
