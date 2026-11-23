import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, describe, expect, it, vi } from "vitest"

import { InviteFriendSection } from "@/features/invites/components/InviteFriendSection"

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn() } }))
vi.mock("@/lib/api-client", async (original) => ({
  ...(await original<typeof import("@/lib/api-client")>()),
  api,
}))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const URL_1 = "https://hobbyhub.test/pozvanka/q3Zr1hXkE0bLw9yT2vNcAa"
const URL_2 = "https://hobbyhub.test/pozvanka/AQEBAQEBAQEBAQEBAQEBAQ"
const json = (data: unknown) => ({ json: () => Promise.resolve(data) })

const show = (joinedCount = 0) => {
  api.get.mockReturnValue(json({ code: "q3Zr1hXkE0bLw9yT2vNcAa", url: URL_1, joinedCount }))
  render(
    <QueryClientProvider client={new QueryClient()}>
      <InviteFriendSection
        viewerId="me"
        interests={["Volejbal"]}
      />
    </QueryClientProvider>,
  )
}

describe("„Pozvi kamaráda“ on Můj profil (#406)", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("shows my link and copies it with a toast", async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    show()

    expect(await screen.findByLabelText("Tvůj odkaz")).toHaveValue(URL_1)
    await user.click(screen.getByRole("button", { name: "Kopírovat" }))

    expect(writeText).toHaveBeenCalledWith(URL_1)
    expect(toast.success).toHaveBeenCalledWith("Odkaz je zkopírovaný.")
    expect(screen.queryByText(/Přes tvůj odkaz/)).not.toBeInTheDocument()
  })

  it("„Poslat pozvánku“ opens the share sheet with a message naming my interests", async () => {
    const user = userEvent.setup()
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal("navigator", { ...navigator, share })
    show()

    await user.click(await screen.findByRole("button", { name: "Poslat pozvánku" }))

    expect(share).toHaveBeenCalledWith({
      title: "Pozvánka na HobbyHub",
      text: "Hledám parťáky na volejbal. Pojď na HobbyHub, ať máme s kým vyrazit.",
      url: URL_1,
    })
  })

  it("says how many joined through it", async () => {
    show(3)
    expect(await screen.findByText("Přes tvůj odkaz se přidali 3 lidé.")).toBeInTheDocument()
  })

  it("„Vytvořit nový odkaz“ asks first, then shows the new link", async () => {
    const user = userEvent.setup()
    api.post.mockReturnValue(json({ code: "AQEBAQEBAQEBAQEBAQEBAQ", url: URL_2, joinedCount: 0 }))
    show()

    await user.click(await screen.findByRole("button", { name: "Vytvořit nový odkaz" }))
    expect(screen.getByRole("dialog", { name: "Vytvořit nový odkaz?" })).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
    await user.click(
      screen.getAllByRole("button", { name: "Vytvořit nový odkaz" }).at(-1)!,
    )

    expect(await screen.findByDisplayValue(URL_2)).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith("invites/me/regenerate")
    expect(toast.success).toHaveBeenCalledWith("Nový odkaz je připravený.")
  })
})
