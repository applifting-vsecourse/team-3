import { requestMessageFor } from './request-message';

describe('requestMessageFor (#175)', () => {
  it('keeps the message only with a waiting request', () => {
    expect(requestMessageFor('pending', 'Ahoj')).toBe('Ahoj');
    expect(requestMessageFor('pending', undefined)).toBeNull();
    expect(requestMessageFor('pending', null)).toBeNull();
    expect(requestMessageFor('approved', 'Ahoj')).toBeNull();
    expect(requestMessageFor('active', 'Ahoj')).toBeNull();
  });
});
