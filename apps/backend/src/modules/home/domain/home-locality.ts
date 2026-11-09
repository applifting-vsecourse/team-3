/**
 * Where the locality of the landing page comes from (B-027, #182), in this
 * order: the page's own choice (`localityId` in the query), the signed-in
 * user's home locality from the profile, and otherwise none = all of Czechia.
 *
 * Extension point for the guess by IP (#55, B-027 `GET /api/geo/locality`):
 * it comes between the profile and all of Czechia. Add an `ipLocalityId`
 * input and the `ip` source here, and fill it in HomeService; nothing else
 * has to change.
 */
export type HomeLocalitySource = 'query' | 'profile';

export const resolveHomeLocalityId = (input: {
  queryLocalityId?: string;
  profileLocalityId?: string | null;
}): { id: string; source: HomeLocalitySource } | null => {
  if (input.queryLocalityId) {
    return { id: input.queryLocalityId, source: 'query' };
  }
  if (input.profileLocalityId) {
    return { id: input.profileLocalityId, source: 'profile' };
  }
  return null;
};
