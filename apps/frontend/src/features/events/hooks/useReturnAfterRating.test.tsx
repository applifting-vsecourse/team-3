import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { useReturnAfterRating } from "./useReturnAfterRating"

function SaveButton() {
  const returnAfterRating = useReturnAfterRating()
  return (
    <button
      type="button"
      onClick={returnAfterRating}
    >
      Uložit
    </button>
  )
}

const RATING = "/akce/e1/hodnoceni"

describe("useReturnAfterRating (#367)", () => {
  it.each([
    ["Moje › Proběhlé, with its chip", "/moje/akce?tab=probehle"],
    ["the event's detail", "/akce/e1"],
  ])("back to %s, where the user came from", async (_from, previous) => {
    const { router } = await renderWithRouter(<SaveButton />, { url: RATING, previous: [previous] })

    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() => expect(router.state.location.href).toBe(previous))
  })

  it("from the e-mail (nothing to go back to): Proběhlé, in place of the form", async () => {
    const { router } = await renderWithRouter(<SaveButton />, { url: RATING })

    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() => expect(router.state.location.href).toBe("/moje/akce?tab=probehle"))
    // replaced, not added: going back doesn't open the rating form again
    expect(router.history.length).toBe(1)
  })
})
