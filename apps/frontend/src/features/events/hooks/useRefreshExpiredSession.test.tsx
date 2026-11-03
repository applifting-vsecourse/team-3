import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { authKeys } from "@/lib/auth-keys"

import { useRefreshExpiredSession } from "@/features/events/hooks/useRefreshExpiredSession"
import { anEventDetail } from "@/features/events/test/anEvent"

const renderCheck = (...args: Parameters<typeof useRefreshExpiredSession>) => {
  const queryClient = new QueryClient()
  const invalidate = vi.spyOn(queryClient, "invalidateQueries")
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  renderHook(() => useRefreshExpiredSession(...args), { wrapper })
  return invalidate
}

describe("useRefreshExpiredSession (#174)", () => {
  it("a signed-in user without a place, who gets no names, keeps their session", () => {
    const invalidate = renderCheck(
      "u9",
      anEventDetail({ participants: null, myParticipation: null, viewerSignedIn: true }),
    )

    expect(invalidate).not.toHaveBeenCalled()
  })

  it("an expired session (the API saw a visitor) is refreshed", () => {
    const invalidate = renderCheck(
      "u9",
      anEventDetail({ participants: null, myParticipation: null, viewerSignedIn: false }),
    )

    expect(invalidate).toHaveBeenCalledWith({ queryKey: authKeys.session() })
  })

  it.each([
    ["a visitor", null],
    ["while the session loads", undefined],
  ])("nothing to refresh for %s", (_, viewerId) => {
    expect(
      renderCheck(viewerId, anEventDetail({ participants: null, viewerSignedIn: false })),
    ).not.toHaveBeenCalled()
  })

  it("nothing to refresh before the detail arrives", () => {
    expect(renderCheck("u9", undefined)).not.toHaveBeenCalled()
  })
})
