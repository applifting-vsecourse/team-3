import { rateLimitOptions } from './rate-limit';

// BetterAuth is ESM-only, which Jest can't load, so its rate limiter isn't run
// here. It applies a custom rule only to the exact path after /api/auth, and
// takes `enabled`, `window`, `max` and its sign-in rule from its defaults
// unless they are set.
describe('rateLimitOptions', () => {
  it('does not limit the session check, which every page load makes', () => {
    expect(rateLimitOptions.customRules['/get-session']).toBe(false);
  });

  it('changes nothing else: sign-in stays at 3 per 10 s, production only', () => {
    expect(Object.keys(rateLimitOptions)).toEqual(['customRules']);
    expect(Object.keys(rateLimitOptions.customRules)).toEqual(['/get-session']);
  });
});
