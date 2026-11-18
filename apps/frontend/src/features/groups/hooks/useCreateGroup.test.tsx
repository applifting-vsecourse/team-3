import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api-client"
import type * as ApiClient from "@/lib/api-client"

import type { GroupDetail, GroupInput } from "@/features/groups/api/groupSchemas"
import { useCreateGroup, useUpdateGroup } from "@/features/groups/hooks/useGroupMutations"

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  api: { post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}))

const input: GroupInput = {
  name: "Deskovky Letná",
  description: null,
  activityId: "a-deskove-hry",
  localityId: "l-praha-7",
  type: "public",
}
const created: GroupDetail = {
  id: "g1",
  ...input,
  activity: {
    id: "a-deskove-hry",
    slug: "deskove-hry",
    name: "Deskové hry",
    category: { id: "c-hry", slug: "hry", name: "Hry", icon: "dice" },
  },
  locality: { id: "l-praha-7", slug: "praha-7", name: "Praha 7" },
  memberCount: 1,
  imageKey: null,
  status: "active",
  admins: [{ id: "u1", name: "Petra" }],
  viewerMembership: { role: "admin", status: "active" },
}
const file = new File([new Uint8Array([0x89, 0x50])], "parta.png", { type: "image/png" })

const setup = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(() => useCreateGroup(), { wrapper }).result
}

describe("useCreateGroup (#77)", () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset()
    vi.mocked(api.put).mockReset()
    vi.mocked(api.post).mockReturnValue({ json: () => Promise.resolve(created) } as never)
  })

  it("uploads the picked photo to the new group", async () => {
    vi.mocked(api.put).mockReturnValue({
      json: () => Promise.resolve({ ...created, imageKey: "k1" }),
    } as never)
    const result = setup()

    act(() => result.current.mutate({ input, image: file }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const [path, options] = vi.mocked(api.put).mock.calls[0]!
    expect(path).toBe("groups/g1/image")
    expect((options as { body: FormData }).body.get("image")).toBe(file)
    expect(result.current.data?.group.imageKey).toBe("k1")
  })

  it("a failed upload doesn't fail the founded group: it comes back as imageError", async () => {
    vi.mocked(api.put).mockReturnValue({
      json: () => Promise.reject(new Error("Obrázek je moc velký. Nahraj nejvýš 5 MB.")),
    } as never)
    const result = setup()

    act(() => result.current.mutate({ input, image: file }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.group.id).toBe("g1")
    expect(result.current.data?.imageError).toBe("Obrázek je moc velký. Nahraj nejvýš 5 MB.")
  })

  it("without a photo only founds the group", async () => {
    const result = setup()

    act(() => result.current.mutate({ input }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.put).not.toHaveBeenCalled()
  })
})

describe("useUpdateGroup with the group's photo (#77)", () => {
  const setupUpdate = () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    return renderHook(() => useUpdateGroup("g1"), { wrapper }).result
  }

  beforeEach(() => {
    vi.mocked(api.patch).mockReset()
    vi.mocked(api.put).mockReset()
    vi.mocked(api.patch).mockReturnValue({ json: () => Promise.resolve(created) } as never)
  })

  it("saves the changes, then uploads the picked photo", async () => {
    vi.mocked(api.put).mockReturnValue({
      json: () => Promise.resolve({ ...created, imageKey: "k1" }),
    } as never)
    const result = setupUpdate()

    act(() => result.current.mutate({ input, image: { kind: "set", file } }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(vi.mocked(api.put).mock.calls[0]![0]).toBe("groups/g1/image")
    expect(result.current.data?.group.imageKey).toBe("k1")
  })

  it("a failed photo is no failed edit: imageError", async () => {
    vi.mocked(api.put).mockReturnValue({
      json: () => Promise.reject(new Error("Obrázek je moc velký. Nahraj nejvýš 5 MB.")),
    } as never)
    const result = setupUpdate()

    act(() => result.current.mutate({ input, image: { kind: "set", file } }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.imageError).toBe("Obrázek je moc velký. Nahraj nejvýš 5 MB.")
  })
})
