import { optionalUserFromRequest } from './optional-user.decorator';

describe('optionalUserFromRequest', () => {
  it('is the user of the session OptionalUserGuard put on the request', () => {
    const user = {
      id: 'u1',
      email: 'petra@example.com',
      name: 'Petra',
      role: 'user',
    };

    expect(optionalUserFromRequest({ session: { user } })).toBe(user);
  });

  it('is null for a visitor, whether the guard set null or nothing', () => {
    expect(optionalUserFromRequest({ session: null })).toBeNull();
    expect(optionalUserFromRequest({})).toBeNull();
  });
});
