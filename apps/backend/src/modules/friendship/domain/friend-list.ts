import { friendshipState, type FriendshipRow } from './friendship';

/** A person in the lists: what the rows of „Lidé, které znám“ show (Figma B-05f, B-09). */
export type FriendPerson = {
  id: string;
  name: string;
  interests: { id: string; name: string }[];
};

/** The other person of a row, as loaded: blocked and deleted accounts aren't listed. */
export type FriendPersonRecord = {
  id: string;
  name: string;
  deletedAt: Date | null;
  blockedAt: Date | null;
  interests: { activity: { id: string; name: string } }[];
};

export type FriendshipRecord = FriendshipRow & {
  /** When the request was sent (a request sent again starts anew). */
  createdAt: Date;
  requester: FriendPersonRecord;
  addressee: FriendPersonRecord;
};

export type FriendRequest = { person: FriendPerson; requestedAt: Date };

export type FriendLists = {
  /** Friends, by name (Czech order). */
  friends: FriendPerson[];
  /** Requests waiting for me, the newest first. */
  incoming: FriendRequest[];
  /** My requests — quietly rejected ones too, they look the same (18. 11.) — the newest first. */
  outgoing: FriendRequest[];
};

const person = (record: FriendPersonRecord): FriendPerson => ({
  id: record.id,
  name: record.name,
  interests: record.interests.map(({ activity }) => ({
    id: activity.id,
    name: activity.name,
  })),
});

const newestFirst = (a: FriendRequest, b: FriendRequest): number =>
  b.requestedAt.getTime() - a.requestedAt.getTime();

/**
 * The viewer's rows sorted into friends, requests waiting for them and their own requests, by
 * the same rule as the profile's button (`friendshipState`). A request the viewer rejected is
 * nowhere; a blocked or deleted person neither.
 */
export function friendLists(
  rows: FriendshipRecord[],
  viewerId: string,
): FriendLists {
  const lists: FriendLists = { friends: [], incoming: [], outgoing: [] };
  for (const row of rows) {
    const other = row.requesterId === viewerId ? row.addressee : row.requester;
    if (other.deletedAt || other.blockedAt) continue;
    const state = friendshipState(row, viewerId, other.id);
    if (state === 'friends') lists.friends.push(person(other));
    else if (state === 'incoming')
      lists.incoming.push({
        person: person(other),
        requestedAt: row.createdAt,
      });
    else if (state === 'outgoing')
      lists.outgoing.push({
        person: person(other),
        requestedAt: row.createdAt,
      });
  }
  lists.friends.sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  lists.incoming.sort(newestFirst);
  lists.outgoing.sort(newestFirst);
  return lists;
}
