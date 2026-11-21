import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api-client"
import type * as ApiClient from "@/lib/api-client"

import { friendsKeys } from "@/features/friends/api/friendsQueryOptions"
import { useFriendshipChange } from "@/features/friends/hooks/useFriendMutations"

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  api: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

const answer = (state: string) => ({ json: () => Promise.resolve({ state }) }) as never

const setup = (onSettled?: () => Promise<unknown>) => {
  const queryClient = new QueryClient()
  queryClient.setQueryData(friendsKeys.lists("me"), { friends: [], incoming: [], outgoing: [] })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper, onSettled }
}

describe("useFriendshipChange (#307)", () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    ["request", "post", undefined, "outgoing"],
    ["reject", "patch", { json: { status: "rejected" } }, "none"],
    ["remove", "delete", undefined, "none"],
  ] as const)(
    "%s calls %s /api/friends/:userId and answers the new state",
    async (change, method, options, state) => {
      vi.mocked(api[method]).mockReturnValue(answer(state))
      const { wrapper } = setup()
      const { result } = renderHook(() => useFriendshipChange(change), { wrapper })

      await expect(act(() => result.current.mutateAsync("petra/1"))).resolves.toBe(state)

      expect(api[method]).toHaveBeenCalledWith("friends/petra%2F1", ...(options ? [options] : []))
    },
  )

  it("refreshes the lists and lets the route refresh the profile", async () => {
    vi.mocked(api.post).mockReturnValue(answer("friends"))
    const onSettled = vi.fn().mockResolvedValue(undefined)
    const { queryClient, wrapper } = setup()
    const { result } = renderHook(() => useFriendshipChange("request", onSettled), { wrapper })

    await act(() => result.current.mutateAsync("petra"))

    expect(queryClient.getQueryState(friendsKeys.lists("me"))?.isInvalidated).toBe(true)
    expect(onSettled).toHaveBeenCalled()
  })

  it("refreshes after a refusal too: another tab may have changed things", async () => {
    vi.mocked(api.post).mockReturnValue({
      json: () => Promise.reject(new Error("Žádost už je odeslaná.")),
    } as never)
    const onSettled = vi.fn().mockResolvedValue(undefined)
    const { queryClient, wrapper } = setup()
    const { result } = renderHook(() => useFriendshipChange("request", onSettled), { wrapper })

    await act(() => result.current.mutateAsync("petra").catch(() => undefined))

    expect(queryClient.getQueryState(friendsKeys.lists("me"))?.isInvalidated).toBe(true)
    expect(onSettled).toHaveBeenCalled()
  })
})
