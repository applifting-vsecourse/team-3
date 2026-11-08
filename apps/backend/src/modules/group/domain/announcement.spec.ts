import {
  ANNOUNCEMENTS_PER_DAY,
  canReadAnnouncements,
  canSendAnnouncements,
  decideAnnouncement,
  remainingAnnouncements,
} from './announcement';

describe('announcements (#194)', () => {
  describe('canReadAnnouncements', () => {
    it('an active member or admin reads them', () => {
      expect(canReadAnnouncements({ role: 'member', status: 'active' })).toBe(
        true,
      );
      expect(canReadAnnouncements({ role: 'admin', status: 'active' })).toBe(
        true,
      );
    });

    it('a visitor, an applicant or a blocked member does not', () => {
      expect(canReadAnnouncements(null)).toBe(false);
      expect(canReadAnnouncements({ role: 'member', status: 'pending' })).toBe(
        false,
      );
      expect(canReadAnnouncements({ role: 'member', status: 'blocked' })).toBe(
        false,
      );
    });
  });

  describe('canSendAnnouncements', () => {
    const active = { status: 'active' as const };

    it('only an active admin of an active group', () => {
      expect(
        canSendAnnouncements(active, { role: 'admin', status: 'active' }),
      ).toBe(true);
      expect(
        canSendAnnouncements(active, { role: 'member', status: 'active' }),
      ).toBe(false);
      expect(
        canSendAnnouncements(active, { role: 'admin', status: 'blocked' }),
      ).toBe(false);
      expect(canSendAnnouncements(active, null)).toBe(false);
    });

    it('nobody in a deactivated group', () => {
      expect(
        canSendAnnouncements(
          { status: 'inactive' },
          { role: 'admin', status: 'active' },
        ),
      ).toBe(false);
    });
  });

  describe('the daily limit', () => {
    it(`is ${ANNOUNCEMENTS_PER_DAY} a day and never goes below zero`, () => {
      expect(remainingAnnouncements(0)).toBe(3);
      expect(remainingAnnouncements(2)).toBe(1);
      expect(remainingAnnouncements(3)).toBe(0);
      expect(remainingAnnouncements(7)).toBe(0);
    });

    it('lets the last one of the day through and refuses the next', () => {
      expect(
        decideAnnouncement({ groupStatus: 'active', sentToday: 2 }),
      ).toEqual({ ok: true });
      expect(
        decideAnnouncement({ groupStatus: 'active', sentToday: 3 }),
      ).toEqual({ ok: false, refusal: 'ANNOUNCEMENT_LIMIT' });
    });

    it('a deactivated group refuses before the limit counts', () => {
      expect(
        decideAnnouncement({ groupStatus: 'inactive', sentToday: 0 }),
      ).toEqual({ ok: false, refusal: 'GROUP_INACTIVE' });
    });
  });
});
