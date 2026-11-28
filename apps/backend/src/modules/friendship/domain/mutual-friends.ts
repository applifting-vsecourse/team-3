/**
 * Společní přátelé (#473): on a Najdi parťáka card only how many, never who. The friend list
 * isn't public (user/README), so names would tell a stranger whom someone is friends with; a
 * count of 1 would too („I have one friend, so Petra is friends with Tomáš“). Below this the
 * count isn't sent at all, not even in the network tab.
 */
export const MUTUAL_FRIENDS_SHOWN_FROM = 2;

/** An accepted friendship as loaded: the two sides, whichever asked. */
export type AcceptedPair = { requesterId: string; addresseeId: string };

/**
 * How many of my friends each of `otherIds` is friends with. `myFriendIds` are only my active
 * friends (verified, not blocked or deleted, as `GET /api/friends` lists them) and `pairs`
 * only accepted friendships, so a pending or rejected request never counts.
 */
export function countMutualFriends(
  myFriendIds: readonly string[],
  pairs: readonly AcceptedPair[],
  otherIds: readonly string[],
): Map<string, number> {
  const friends = new Set(myFriendIds);
  const mutual = new Map<string, Set<string>>(
    otherIds.map((id) => [id, new Set<string>()]),
  );
  for (const { requesterId, addresseeId } of pairs) {
    if (friends.has(requesterId)) mutual.get(addresseeId)?.add(requesterId);
    if (friends.has(addresseeId)) mutual.get(requesterId)?.add(addresseeId);
  }
  return new Map([...mutual].map(([id, ids]) => [id, ids.size]));
}

/** The count as the API gives it: null below `MUTUAL_FRIENDS_SHOWN_FROM`, never 1. */
export function shownMutualFriends(count: number): number | null {
  return count >= MUTUAL_FRIENDS_SHOWN_FROM ? count : null;
}
