import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type * as ApiClient from "@/lib/api-client"

import { InviteBanner } from "@/features/invites/components/InviteBanner"
import { pendingInvite, rememberInvite } from "@/features/invites/lib/invite"

const { api } = vi.hoisted(() => ({ api: { get: vi.fn() } }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  api,
}))

const CODE = "q3Zr1hXkE0bLw9yT2vNcAa"

const show = (code: string | null) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <InviteBanner code={code} />
    </QueryClientProvider>,
  )

describe("InviteBanner on the sign-up (#406)", () => {
  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it("shows who invites, from the code remembered in this browser", async () => {
    api.get.mockReturnValue({
      json: () =>
        Promise.resolve({ id: "u1", name: "Tomáš Novák", interests: ["Volejbal", "Běh"] }),
    })
    rememberInvite(CODE)

    show(pendingInvite("/akce"))

    expect(await screen.findByText("Tomáš Novák tě zve na HobbyHub")).toBeInTheDocument()
    expect(screen.getByText("Volejbal, Běh")).toBeInTheDocument()
    expect(screen.getByText("Po registraci budete rovnou přátelé.")).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith(`invites/${CODE}`)
  })

  it("shows nothing for an invalid code or a blocked inviter", async () => {
    const { HTTPError } = await import("@/lib/api-client")
    const notFound = Object.create(HTTPError.prototype) as InstanceType<typeof HTTPError>
    Object.defineProperty(notFound, "response", { value: { status: 404 } })
    api.get.mockReturnValue({ json: () => Promise.reject(notFound) })

    const { container } = show(CODE)

    await vi.waitFor(() => expect(api.get).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it("asks nothing without a code", () => {
    const { container } = show(null)
    expect(container).toBeEmptyDOMElement()
    expect(api.get).not.toHaveBeenCalled()
  })
})
