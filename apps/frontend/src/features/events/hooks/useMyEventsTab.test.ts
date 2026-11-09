import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { MyEvent } from "@/features/events/api/eventSchemas"
import { useMyEventsTab } from "@/features/events/hooks/useMyEvents"
import type { MyEventsTabName } from "@/features/events/lib/myEvents"
import { aMyEvent } from "@/features/events/test/anEvent"

type Data = { events?: MyEvent[]; isPending: boolean }
type Props = { urlTab?: MyEventsTabName; attending: Data; organizing: Data }

const loading: Data = { isPending: true }
const loaded = (events: MyEvent[]): Data => ({ events, isPending: false })
const withRequests = loaded([aMyEvent({ id: "o1", pendingRequests: 1 })])
const noRequests = loaded([aMyEvent({ id: "o1", pendingRequests: 0 })])
const going = loaded([aMyEvent({ id: "a1" })])

const renderTab = (initialProps: Props) =>
  renderHook(
    ({ urlTab, attending, organizing }: Props) => useMyEventsTab(urlTab, attending, organizing),
    { initialProps },
  )

describe("useMyEventsTab (#188)", () => {
  it("is undefined while loading — no Přihlášen before Pořádám — then picks", () => {
    const { result, rerender } = renderTab({ attending: loading, organizing: loading })
    expect(result.current).toBeUndefined()

    rerender({ attending: going, organizing: withRequests })
    expect(result.current).toBe("poradam")
  })

  it("keeps the tab it picked when a refetch changes the requests", () => {
    const { result, rerender } = renderTab({ attending: going, organizing: withRequests })
    expect(result.current).toBe("poradam")

    // the request was decided elsewhere; a live refresh brings Pořádám without it
    rerender({ attending: going, organizing: noRequests })
    expect(result.current).toBe("poradam")
  })

  it("and the other way: requests arriving later don't pull the user off Přihlášen", () => {
    const { result, rerender } = renderTab({ attending: going, organizing: noRequests })
    expect(result.current).toBe("prihlasen")

    rerender({ attending: going, organizing: withRequests })
    expect(result.current).toBe("prihlasen")
  })

  it("the tab in the URL wins, whatever waits", () => {
    const { result, rerender } = renderTab({
      urlTab: "prihlasen",
      attending: going,
      organizing: withRequests,
    })
    expect(result.current).toBe("prihlasen")

    // even while still loading
    rerender({ urlTab: "poradam", attending: loading, organizing: loading })
    expect(result.current).toBe("poradam")
  })

  it("without the URL's tab again (the navigation's „Moje akce“), back to the one picked", () => {
    const { result, rerender } = renderTab({
      urlTab: "prihlasen",
      attending: going,
      organizing: withRequests,
    })
    rerender({ attending: going, organizing: noRequests })
    expect(result.current).toBe("poradam")
  })
})
