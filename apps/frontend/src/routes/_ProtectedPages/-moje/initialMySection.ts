import type { MyEvent } from "@/features/events/api/eventSchemas"
import { pendingRequestsSummary } from "@/features/events/lib/myEvents"
import type { MyGroup } from "@/features/groups/api/groupSchemas"
import { membershipRequestsSummary } from "@/features/groups/lib/myGroups"

import type { MySection } from "./MyPage"

/**
 * The tab „Moje“ opens on from the navigation (#304): Akce, unless the only requests to decide
 * are requests to join my groups — then Skupiny, where they are. With requests on both sides
 * (or none, or data that failed to load) it is Akce, the first tab; its own chip then picks
 * Pořádám (#188).
 */
export function initialMySection(
  organizing: MyEvent[] | undefined,
  groups: MyGroup[] | undefined,
): MySection {
  if (organizing && pendingRequestsSummary(organizing)) return "akce"
  return groups && membershipRequestsSummary(groups) ? "skupiny" : "akce"
}
