import { resolveHomeLocalityId } from './home-locality';

describe('resolveHomeLocalityId', () => {
  it("the page's own choice wins over the profile", () => {
    expect(
      resolveHomeLocalityId({
        queryLocalityId: 'l-brno',
        profileLocalityId: 'l-praha-3',
      }),
    ).toEqual({ id: 'l-brno', source: 'query' });
  });

  it('without a choice a signed-in user gets the home locality', () => {
    expect(resolveHomeLocalityId({ profileLocalityId: 'l-praha-3' })).toEqual({
      id: 'l-praha-3',
      source: 'profile',
    });
  });

  it('all of Czechia picked on purpose: no home locality in its place (#299)', () => {
    expect(
      resolveHomeLocalityId({
        isWholeCountry: true,
        profileLocalityId: 'l-praha-3',
      }),
    ).toBeNull();
  });

  it('a visitor without a choice gets all of Czechia (null), not Prague', () => {
    expect(resolveHomeLocalityId({})).toBeNull();
    expect(resolveHomeLocalityId({ profileLocalityId: null })).toBeNull();
  });
});
