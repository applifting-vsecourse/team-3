import { isSuperadmin, superadminRefusal } from './superadmin';

const admin = {
  role: 'admin',
  blockedAt: null,
  ageConfirmedAt: new Date('2026-11-01T10:00:00.000Z'),
};

describe('the superadmin rule (#308, review #380)', () => {
  it('an admin, not blocked, with the age confirmed', () => {
    expect(superadminRefusal(admin)).toBeNull();
    expect(isSuperadmin(admin)).toBe(true);
  });

  it('a regular user is not', () => {
    expect(superadminRefusal({ ...admin, role: 'user' })).toBe('NOT_ADMIN');
    expect(isSuperadmin({ ...admin, role: 'user' })).toBe(false);
  });

  it('a blocked admin is not', () => {
    const blocked = { ...admin, blockedAt: new Date() };
    expect(superadminRefusal(blocked)).toBe('NOT_ADMIN');
    expect(isSuperadmin(blocked)).toBe(false);
  });

  it('an admin without the age confirmed is not, yet (#107)', () => {
    const unconfirmed = { ...admin, ageConfirmedAt: null };
    expect(superadminRefusal(unconfirmed)).toBe('AGE_CONFIRMATION_REQUIRED');
    expect(isSuperadmin(unconfirmed)).toBe(false);
  });

  it('nobody is no superadmin', () => {
    expect(isSuperadmin(null)).toBe(false);
  });
});
