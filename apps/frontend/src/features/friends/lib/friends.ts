import { z } from "zod"

import type { FriendLists, FriendPerson } from "@/features/friends/api/friendsSchemas"

/**
 * The chip in the URL (#307, Figma B-09, B-09a): `?tab=pratele` or `?tab=zadosti` — the
 * upozornění of #86 will lead to the requests. Without one the page picks (`initialFriendsTab`).
 */
export const friendsSearchSchema = z.object({
  tab: z.enum(["pratele", "zadosti"]).optional().catch(undefined),
})
export type FriendsTab = NonNullable<z.infer<typeof friendsSearchSchema>["tab"]>

/** Žádosti while a request waits for me — it waits for an answer — otherwise Přátelé (as #188). */
export const initialFriendsTab = (lists: FriendLists): FriendsTab =>
  lists.incoming.length > 0 ? "zadosti" : "pratele"

// „Novák“ finds „Nováková“, „cenek“ finds „Čeněk“: no case, no diacritics
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("cs")

/** Whether the friend's name holds what was typed; nothing typed holds everyone. */
export const matchesName = (person: FriendPerson, query: string): boolean =>
  fold(person.name).includes(fold(query.trim()))

/** „Volejbal · Běh“: the second line of a person's row (Figma Person row). */
export const interestsLine = (person: FriendPerson): string =>
  person.interests.map((interest) => interest.name).join(" · ")
