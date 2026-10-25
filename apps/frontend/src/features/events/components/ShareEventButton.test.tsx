import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ShareEventButton } from "@/features/events/components/ShareEventButton"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe("ShareEventButton", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("copies the detail's link and says so (A-05d)", async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    // after setup(): user-event installs its own clipboard on the navigator
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    render(<ShareEventButton label="Sdílet odkaz" />)

    await user.click(screen.getByRole("button", { name: "Sdílet odkaz" }))

    expect(writeText).toHaveBeenCalledWith(window.location.href)
    expect(toast.success).toHaveBeenCalledWith("Odkaz je zkopírovaný.")
  })

  it("on a phone opens the share sheet where there is one (A-05)", async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal("navigator", { ...navigator, share })
    render(
      <ShareEventButton
        label="Sdílet"
        shouldUseShareSheet
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Sdílet" }))

    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: window.location.href }))
    expect(toast.success).not.toHaveBeenCalled()
  })
})
