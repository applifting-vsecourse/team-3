import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api-client"
import type * as ApiClient from "@/lib/api-client"

import { useUpdateEvent, type EventChangesInput } from "@/features/events/hooks/useUpdateEvent"
import { anEventDetail } from "@/features/events/test/anEvent"

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  api: { patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const changes = { title: "Deskovky ve středu" } as EventChangesInput
const saved = anEventDetail({ title: "Deskovky ve středu" })
const file = new File([new Uint8Array([0x89, 0x50])], "plakat.png", { type: "image/png" })
const answer = (body: unknown) => ({ json: () => Promise.resolve(body) }) as never

const setup = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useUpdateEvent(saved.id, "u1"), { wrapper })
  return { queryClient, result }
}

describe("useUpdateEvent with the event's image (#77)", () => {
  beforeEach(() => {
    vi.mocked(api.patch).mockReset().mockReturnValue(answer(saved))
    vi.mocked(api.put).mockReset()
    vi.mocked(api.delete).mockReset()
  })

  it("saves the changes, then uploads the picked image; the detail has it", async () => {
    vi.mocked(api.put).mockReturnValue(answer({ ...saved, imageKey: "k1" }))
    const { queryClient, result } = setup()

    act(() => result.current.mutate({ changes, image: { kind: "set", file } }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(vi.mocked(api.patch).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(api.put).mock.invocationCallOrder[0]!,
    )
    expect(vi.mocked(api.put).mock.calls[0]![0]).toBe(`events/${saved.id}/image`)
    expect(result.current.data?.imageError).toBeNull()
    expect(
      queryClient.getQueryData<{ imageKey: string }>(["events", "detail", saved.id, "u1"])
        ?.imageKey,
    ).toBe("k1")
  })

  it("„Odebrat“ deletes the image", async () => {
    vi.mocked(api.delete).mockReturnValue(answer({ ...saved, imageKey: null }))
    const { result } = setup()

    act(() => result.current.mutate({ changes, image: { kind: "remove" } }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith(`events/${saved.id}/image`)
  })

  it("a failed image is no failed edit: the saved changes come back with imageError", async () => {
    vi.mocked(api.put).mockReturnValue({
      json: () => Promise.reject(new Error("Obrázek je moc velký. Nahraj nejvýš 5 MB.")),
    } as never)
    const { queryClient, result } = setup()

    act(() => result.current.mutate({ changes, image: { kind: "set", file } }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.imageError).toBe("Obrázek je moc velký. Nahraj nejvýš 5 MB.")
    // the detail shows what was saved
    expect(
      queryClient.getQueryData<{ title: string }>(["events", "detail", saved.id, "u1"])?.title,
    ).toBe("Deskovky ve středu")
  })

  it("without an image change only saves", async () => {
    const { result } = setup()

    act(() => result.current.mutate({ changes }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.put).not.toHaveBeenCalled()
    expect(api.delete).not.toHaveBeenCalled()
  })
})
