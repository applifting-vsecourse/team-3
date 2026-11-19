import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api-client"
import type * as ApiClient from "@/lib/api-client"

import type { EventInput } from "@/features/events/api/eventSchemas"
import { useCreateEvent } from "@/features/events/hooks/useCreateEvent"
import { anEventDetail } from "@/features/events/test/anEvent"

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  api: { post: vi.fn(), put: vi.fn() },
}))

const input: EventInput = {
  title: "Deskovky",
  description: null,
  activityId: "a-deskove-hry",
  localityId: "l-praha-8",
  lat: 50.11,
  lng: 14.47,
  address: "Herna",
  startsAt: "2026-12-01T17:00:00.000Z",
  endsAt: null,
  minParticipants: 3,
  maxParticipants: 6,
  approvalMode: "open",
}
const created = { ...anEventDetail(), shareUrl: "http://app.test/akce/e1" }
const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "plakat.png", {
  type: "image/png",
})

const setup = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useCreateEvent(), { wrapper })
  return { queryClient, result }
}

describe("useCreateEvent", () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset()
    vi.mocked(api.put).mockReset()
    vi.mocked(api.post).mockReturnValue({ json: () => Promise.resolve(created) } as never)
  })

  it("without an image only creates the event", async () => {
    const { result } = setup()

    act(() => result.current.mutate({ input }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith("events", { json: input })
    expect(api.put).not.toHaveBeenCalled()
    expect(result.current.data?.imageError).toBeNull()
  })

  it("uploads the picked image to the new event as multipart (#77)", async () => {
    vi.mocked(api.put).mockReturnValue({
      json: () => Promise.resolve({ ...anEventDetail(), imageKey: "k1" }),
    } as never)
    const { queryClient, result } = setup()

    act(() => result.current.mutate({ input, image: file }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const [path, options] = vi.mocked(api.put).mock.calls[0]!
    expect(path).toBe(`events/${created.id}/image`)
    const body = (options as { body: FormData }).body
    expect(body.get("image")).toBe(file)
    // the detail the page opens next already has the image
    expect(
      queryClient.getQueryData<{ imageKey: string }>([
        "events",
        "detail",
        created.id,
        created.organizer.id,
      ])?.imageKey,
    ).toBe("k1")
  })

  it("a failed upload doesn't fail the published event: it comes back as imageError", async () => {
    vi.mocked(api.put).mockReturnValue({
      json: () => Promise.reject(new Error("Obrázek je moc velký. Nahraj nejvýš 5 MB.")),
    } as never)
    const { result } = setup()

    act(() => result.current.mutate({ input, image: file }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.event.id).toBe(created.id)
    expect(result.current.data?.imageError).toBe("Obrázek je moc velký. Nahraj nejvýš 5 MB.")
  })
})
