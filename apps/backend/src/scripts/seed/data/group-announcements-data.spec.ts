import {
  ANNOUNCEMENT_BODY_MAX_LENGTH,
  ANNOUNCEMENT_SUBJECT_MAX_LENGTH,
} from '@/modules/group/domain/announcement';
import { groupAnnouncements } from './group-announcements-data';
import { allGroups } from './group-events-data';

// Kontroly oznámení v seedu (#194): jen to, co by šlo poslat přes API.
describe('group announcements in the seed (#194)', () => {
  it('each was written by an active admin of an active group', () => {
    for (const announcement of groupAnnouncements) {
      const group = allGroups.find((g) => g.key === announcement.groupKey);
      expect(`${announcement.groupKey} ${group?.status}`).toBe(
        `${announcement.groupKey} active`,
      );
      const sender = group?.members.find(
        (m) => m.userKey === announcement.senderKey,
      );
      expect(sender).toMatchObject({ role: 'admin', status: 'active' });
    }
  });

  it('fits the limits of the API and leaves the day of the seed free', () => {
    for (const announcement of groupAnnouncements) {
      expect(announcement.subject.length).toBeLessThanOrEqual(
        ANNOUNCEMENT_SUBJECT_MAX_LENGTH,
      );
      expect(announcement.body.length).toBeLessThanOrEqual(
        ANNOUNCEMENT_BODY_MAX_LENGTH,
      );
      expect(announcement.daysAgo).toBeGreaterThanOrEqual(1);
    }
  });

  it('demo: Jakub is a member where Tomáš wrote, and only waits in the closed group', () => {
    const membershipOf = (groupKey: string) =>
      allGroups
        .find((g) => g.key === groupKey)
        ?.members.find((m) => m.userKey === 'uzivatel')?.status;

    expect(membershipOf('g-florbal')).toBe('active');
    expect(membershipOf('g-florbal-pokrocili')).toBe('pending');
  });
});
