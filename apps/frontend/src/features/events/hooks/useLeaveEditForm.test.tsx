import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { useLeaveEditForm } from "@/features/events/hooks/useLeaveEditForm"

function SaveButton() {
  const leaveForm = useLeaveEditForm("e1")
  return (
    <button
      type="button"
      onClick={leaveForm}
    >
      Uložit
    </button>
  )
}

describe("useLeaveEditForm", () => {
  it("goes back to the page before the form, e.g. the detail the edit was opened from", async () => {
    const { router } = await renderWithRouter(<SaveButton />, {
      url: "/akce/e1/upravit",
      previous: ["/akce/e1"],
    })

    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/akce/e1"))
    // back, not another entry on top: the saved form isn't behind „Zpět“
    expect(router.history.length).toBe(2)
  })

  it("opened from a link, Správa akce replaces the form, where its back link leads", async () => {
    const { router } = await renderWithRouter(<SaveButton />, { url: "/akce/e1/upravit" })

    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/akce/e1/sprava"))
    expect(router.history.length).toBe(1)
  })
})
