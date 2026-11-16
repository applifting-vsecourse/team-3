import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { MyGroup } from "@/features/groups/api/groupSchemas"
import { useMyGroupsTab } from "@/features/groups/hooks/useMyGroups"
import { myGroupsSections, type MyGroupsTabName } from "@/features/groups/lib/myGroups"

const group = (
  membership: MyGroup["membership"],
  pendingRequests: number | null = null,
): MyGroup => ({
  id: `${membership.role}-${membership.status}`,
  name: "Skupina",
  type: "closed",
  activity: {
    id: "a",
    slug: "florbal",
    name: "Florbal",
    category: { id: "c", slug: "c", name: "Týmové sporty", icon: "ball" },
  },
  locality: { id: "l", slug: "praha-9", name: "Praha 9" },
  memberCount: 5,
  membership,
  pendingRequests,
})

const member = group({ role: "member", status: "active" })
const running = (requests: number) => group({ role: "admin", status: "active" }, requests)

type Props = { url?: MyGroupsTabName; groups?: MyGroup[]; error?: Error }

const render = (initial: Props) =>
  renderHook(
    ({ url, groups, error }: Props) =>
      useMyGroupsTab(url, { sections: groups && myGroupsSections(groups), error }),
    { initialProps: initial },
  )

describe("useMyGroupsTab (#304, review #318)", () => {
  it("undefined while the groups load, then the chip they pick", () => {
    const { result, rerender } = render({})
    expect(result.current).toBeUndefined()

    rerender({ groups: [member, running(1)] })
    expect(result.current).toBe("spravuju")
  })

  it("keeps its pick when a refetch changes the requests (another admin decided the last one)", () => {
    const { result, rerender } = render({ groups: [member, running(1)] })

    rerender({ groups: [member, running(0)] })

    expect(result.current).toBe("spravuju")
  })

  it("groups that failed to load show Jsem členem, where the error and „Zkusit znovu“ show", () => {
    const { result } = render({ error: new Error("HTTP 500") })

    expect(result.current).toBe("clen")
  })

  it("after „Zkusit znovu“ the first real data pick, not the error (review #318, 2nd round)", () => {
    const { result, rerender } = render({ error: new Error("HTTP 500") })

    rerender({ groups: [member, running(1)] })

    expect(result.current).toBe("spravuju")
  })

  it("the URL's chip wins", () => {
    const { result } = render({ url: "clen", groups: [member, running(1)] })

    expect(result.current).toBe("clen")
  })
})
