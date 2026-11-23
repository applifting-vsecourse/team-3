import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { exportFileName } from "@/features/auth/api/accountApi"

import { useDeleteAccount } from "./useAccountActions"

const { api, signOut, navigate, toast } = vi.hoisted(() => ({
  api: { delete: vi.fn(), get: vi.fn() },
  signOut: vi.fn(),
  navigate: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock("@/lib/api-client", () => ({ api }))
vi.mock("@/features/auth/lib/auth-client", () => ({ authClient: { signOut } }))
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }))
vi.mock("sonner", () => ({ toast }))

const wrapper = (client: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }

beforeEach(() => {
  vi.clearAllMocks()
})

describe("useDeleteAccount (#64)", () => {
  it("deletes, signs out, goes home with nothing of the account cached, and says so", async () => {
    api.delete.mockResolvedValue(undefined)
    signOut.mockRejectedValue(new Error("no session")) // the server ended it already
    const client = new QueryClient()
    client.setQueryData(["profile", "self", "owner"], { name: "Jana" })
    const { result } = renderHook(() => useDeleteAccount(), { wrapper: wrapper(client) })

    result.current.mutate({ password: "Tajne123" })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith("me", { json: { password: "Tajne123" } })
    expect(signOut).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith({ to: "/" })
    expect(client.getQueryData(["profile", "self", "owner"])).toBeUndefined()
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Účet je smazaný."))
  })

  it("stays signed in when the server refuses", async () => {
    api.delete.mockRejectedValue(new Error("Heslo nesedí. Zkus to znovu."))
    const { result } = renderHook(() => useDeleteAccount(), {
      wrapper: wrapper(new QueryClient()),
    })

    result.current.mutate({ password: "spatne" })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(signOut).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })
})

describe("exportFileName (#64)", () => {
  it("names the file by the day", () => {
    expect(exportFileName(new Date(2026, 10, 3, 9))).toBe("hobbyhub-moje-data-2026-11-03.json")
  })
})
