import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { useLeaveEditForm } from "@/features/events/hooks/useLeaveEditForm"

function SaveButton({ canManage }: { canManage?: boolean }) {
  const leaveForm = useLeaveEditForm("e1", { canManage })
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
  it("goes back to whatever page was before the form, not to a fixed page", async () => {
    const { router } = await renderWithRouter(<SaveButton />, {
      url: "/akce/e1/upravit",
      previous: ["/moje/akce"],
    })

    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/moje/akce"))
    // back, not another entry on top: the saved form isn't behind „Zpět“
    expect(router.history.length).toBe(2)
  })

  it("opened from a link, Správa akce replaces the form, where its back link leads", async () => {
    const { router } = await renderWithRouter(<SaveButton />, { url: "/akce/e1/upravit" })

    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/akce/e1/sprava"))
    expect(router.history.length).toBe(1)
  })

  it("the superadmin, who doesn't manage the event, goes to its detail (#308)", async () => {
    const { router } = await renderWithRouter(<SaveButton canManage={false} />, {
      url: "/akce/e1/upravit",
    })

    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/akce/e1"))
  })
})
