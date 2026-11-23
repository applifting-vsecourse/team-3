import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, describe, expect, it, vi } from "vitest"

import type * as ApiClient from "@/lib/api-client"

import { useOnboardingInvite } from "@/features/invites/hooks/useOnboardingInvite"
import { pendingInvite } from "@/features/invites/lib/invite"

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn() } }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  api,
}))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const CODE = "q3Zr1hXkE0bLw9yT2vNcAa"
const FROM = `/pozvanka/${CODE}`
const json = (data: unknown) => ({ json: () => Promise.resolve(data) })

/** The onboarding page in short: „Uložit“ waits for the invite step, then moves on. */
function Onboarding({ viewerId, onDone }: { viewerId: string; onDone: () => void }) {
  const invite = useOnboardingInvite(viewerId, FROM)
  return (
    <>
      <button onClick={() => void invite.offer().then(onDone)}>Uložit</button>
      {invite.step}
    </>
  )
}

const show = (viewerId = "me") => {
  const onDone = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Onboarding
        viewerId={viewerId}
        onDone={onDone}
      />
    </QueryClientProvider>,
  )
  return onDone
}

describe("the onboarding's invite step (#406)", () => {
  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it("„Přidat do přátel“: friends at once, a toast, then the onboarding goes on", async () => {
    const user = userEvent.setup()
    api.get.mockReturnValue(json({ id: "u1", name: "Tomáš Novák", interests: [] }))
    api.post.mockReturnValue(json({ state: "friends" }))
    const onDone = show()

    await user.click(screen.getByRole("button", { name: "Uložit" }))
    expect(
      await screen.findByRole("heading", { name: "Tomáš Novák tě sem zve" }),
    ).toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Přidat do přátel" }))

    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(api.post).toHaveBeenCalledWith(`invites/${CODE}/accept`, {
      json: { befriend: true },
    })
    expect(toast.success).toHaveBeenCalledWith("Tomáš Novák je teď mezi přáteli.")
    // answered: not asked again
    expect(pendingInvite(FROM)).toBeNull()
  })

  it("„Teď ne“: goes on at once, the inviter only hears who joined", async () => {
    const user = userEvent.setup()
    api.get.mockReturnValue(json({ id: "u1", name: "Tomáš Novák", interests: [] }))
    api.post.mockReturnValue(json({ state: "none" }))
    const onDone = show()

    await user.click(screen.getByRole("button", { name: "Uložit" }))
    await user.click(await screen.findByRole("button", { name: "Teď ne" }))

    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(api.post).toHaveBeenCalledWith(`invites/${CODE}/accept`, {
      json: { befriend: false },
    })
    expect(toast.success).not.toHaveBeenCalled()
    expect(screen.queryByRole("heading", { name: /tě sem zve/ })).not.toBeInTheDocument()
  })

  it("one's own link: no step", async () => {
    const user = userEvent.setup()
    api.get.mockReturnValue(json({ id: "me", name: "Já", interests: [] }))
    const onDone = show("me")

    await user.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(screen.queryByRole("heading", { name: /tě sem zve/ })).not.toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it("offline: no step now, the onboarding goes on, the invite is kept", async () => {
    const user = userEvent.setup()
    api.get.mockReturnValue({ json: () => Promise.reject(new Error("offline")) })
    const onDone = show()

    await user.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(api.post).not.toHaveBeenCalled()
    expect(pendingInvite(FROM)).toBe(CODE)
  })

  it("an invalid code (404): no step, never asked again", async () => {
    const user = userEvent.setup()
    const { HTTPError } = await import("@/lib/api-client")
    const notFound = Object.create(HTTPError.prototype) as InstanceType<typeof HTTPError>
    Object.defineProperty(notFound, "response", { value: { status: 404 } })
    api.get.mockReturnValue({ json: () => Promise.reject(notFound) })
    const onDone = show()

    await user.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(pendingInvite(FROM)).toBeNull()
  })
})
