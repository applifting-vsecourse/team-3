import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { InviteShareButton } from "@/features/invites/components/InviteShareButton"
import { inviteShareText } from "@/features/invites/lib/invite"

const { api } = vi.hoisted(() => ({ api: { get: vi.fn() } }))
vi.mock("@/lib/api-client", () => ({ api }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const URL_ = "http://localhost:3000/pozvanka/AbCdEfGhIjKlMnOpQrStUv"

const buttons = async () => {
  // the disabled placeholder first, then the two real ones
  await waitFor(() =>
    expect(screen.getAllByRole("button", { name: "Poslat pozvánku" })).toHaveLength(2),
  )
  return screen.getAllByRole("button", { name: "Poslat pozvánku" })
}

const show = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <InviteShareButton
        viewerId="me"
        interests={["Volejbal"]}
      />
    </QueryClientProvider>,
  )

describe("„Poslat pozvánku“ under the empty friends (#474)", () => {
  const share = vi.fn()
  const writeText = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    api.get.mockReturnValue({
      json: () => Promise.resolve({ code: "AbCdEfGhIjKlMnOpQrStUv", url: URL_, joinedCount: 0 }),
    })
    Object.defineProperty(navigator, "share", { value: share, configurable: true })
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    })
  })
  afterEach(() => {
    Reflect.deleteProperty(navigator, "share")
  })

  it("waits, disabled, until my link is there", () => {
    // never answers
    api.get.mockReturnValue({ json: () => new Promise(vi.fn()) })
    show()

    expect(screen.getByRole("button", { name: "Poslat pozvánku" })).toBeDisabled()
  })

  it("on a phone the share sheet with the invite's message, as on Můj profil", async () => {
    share.mockResolvedValue(undefined)
    show()

    const [phone] = await buttons()
    expect(phone).toHaveClass("md:hidden")
    await userEvent.click(phone!)

    expect(share).toHaveBeenCalledWith({
      title: "Pozvánka na HobbyHub",
      url: URL_,
      text: inviteShareText(["Volejbal"]),
    })
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("a cancelled share sheet (AbortError) is no error and no toast", async () => {
    share.mockRejectedValue(new DOMException("cancelled", "AbortError"))
    show()

    const [phone] = await buttons()
    await userEvent.click(phone!)

    await waitFor(() => expect(share).toHaveBeenCalled())
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it("on desktop copies the link with a toast, no share sheet", async () => {
    writeText.mockResolvedValue(undefined)
    show()

    const desktop = (await buttons())[1]!
    expect(desktop).toHaveClass("hidden", "md:inline-flex")
    await userEvent.click(desktop)

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Odkaz je zkopírovaný."))
    expect(writeText).toHaveBeenCalledWith(URL_)
    expect(share).not.toHaveBeenCalled()
  })
})
