import type { PartnerSuggestion } from '@/modules/partner/domain/partner-suggestions';
import {
  isPartnerHomeDue,
  partnerHomeHiddenUntil,
  partnerHomePreview,
  type PartnerHomeState,
} from './partner-home';

const now = new Date('2026-11-28T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number): Date => new Date(now.getTime() - days * DAY);

// through `unknown`: #473 adds a required `mutualFriendsCount`, and the fixture must type-check
// before and after it, whichever of the two is merged first
const person = (id: string): PartnerSuggestion =>
  ({
    id,
    name: id,
    distanceBandKm: 5,
    sharedInterests: [{ id: 'a', name: 'Volejbal', slug: 'volejbal' }],
    otherInterests: [],
    hasRequestedMe: false,
    mutualFriendsCount: null,
  }) as unknown as PartnerSuggestion;

const fresh: PartnerHomeState = {
  visitedAt: null,
  hiddenUntil: null,
  friendsCount: 0,
};
const deck = {
  missing: [],
  hidden: false,
  items: ['p1', 'p2', 'p3', 'p4'].map(person),
};

describe('partnerHomePreview (#474)', () => {
  it('shows exactly the first three of the deck, in its order', () => {
    expect(partnerHomePreview(deck, fresh, now)).toEqual({
      isShown: true,
      items: [person('p1'), person('p2'), person('p3')],
    });
  });

  it('with fewer than three people it isn’t there at all', () => {
    expect(
      partnerHomePreview(
        { ...deck, items: deck.items.slice(0, 2) },
        fresh,
        now,
      ),
    ).toEqual({ isShown: false, items: [] });
  });

  it('a profile with something missing gets no block', () => {
    expect(
      partnerHomePreview({ ...deck, missing: ['locality'] }, fresh, now),
    ).toEqual({ isShown: false, items: [] });
  });

  it('„Ukazovat mě“ off: no block', () => {
    expect(partnerHomePreview({ ...deck, hidden: true }, fresh, now)).toEqual({
      isShown: false,
      items: [],
    });
  });

  it('the cap hides it with the people at hand too', () => {
    expect(
      partnerHomePreview(deck, { ...fresh, friendsCount: 10 }, now),
    ).toEqual({ isShown: false, items: [] });
  });
});

describe('isPartnerHomeDue (#474)', () => {
  it('nothing recorded: due', () => {
    expect(isPartnerHomeDue(fresh, now)).toBe(true);
  });

  it('a visit to /partaci hides it for 7 days', () => {
    expect(isPartnerHomeDue({ ...fresh, visitedAt: daysAgo(0) }, now)).toBe(
      false,
    );
    expect(isPartnerHomeDue({ ...fresh, visitedAt: daysAgo(6.9) }, now)).toBe(
      false,
    );
    expect(isPartnerHomeDue({ ...fresh, visitedAt: daysAgo(7) }, now)).toBe(
      true,
    );
  });

  it('„Skrýt“ holds until its moment, for 30 days', () => {
    const until = partnerHomeHiddenUntil(now);
    expect(until.getTime() - now.getTime()).toBe(30 * DAY);
    expect(isPartnerHomeDue({ ...fresh, hiddenUntil: until }, now)).toBe(false);
    const later = new Date(now.getTime() + 29 * DAY);
    expect(isPartnerHomeDue({ ...fresh, hiddenUntil: until }, later)).toBe(
      false,
    );
    const after = new Date(now.getTime() + 30 * DAY);
    expect(isPartnerHomeDue({ ...fresh, hiddenUntil: until }, after)).toBe(
      true,
    );
  });

  it('with 10 friends or more it stays away; 9 is still due', () => {
    expect(isPartnerHomeDue({ ...fresh, friendsCount: 9 }, now)).toBe(true);
    expect(isPartnerHomeDue({ ...fresh, friendsCount: 10 }, now)).toBe(false);
  });
});
