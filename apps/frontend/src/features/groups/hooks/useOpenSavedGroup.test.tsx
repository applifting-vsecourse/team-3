import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { useOpenSavedGroup } from "@/features/groups/hooks/useOpenSavedGroup"

function SaveButton() {
  const openSavedGroup = useOpenSavedGroup()
  return (
    <button
      type="button"
      onClick={() => openSavedGroup("g1")}
    >
      Uložit
    </button>
  )
}

describe("useOpenSavedGroup", () => {
  it("after founding a group, back from its detail leads where the user came from, not to the form", async () => {
    const { router } = await renderWithRouter(<SaveButton />, {
      url: "/skupiny/nova",
      previous: ["/skupiny"],
    })

    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))
    await waitFor(() => expect(router.state.location.pathname).toBe("/skupiny/g1"))

    router.history.back()
    await waitFor(() => expect(router.state.location.pathname).toBe("/skupiny"))
  })

  it("after editing a group, back from its detail leads to Správa skupiny, not to the form", async () => {
    const { router } = await renderWithRouter(<SaveButton />, {
      url: "/skupiny/g1/upravit",
      previous: ["/skupiny/g1", "/skupiny/g1/sprava"],
    })

    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))
    await waitFor(() => expect(router.state.location.pathname).toBe("/skupiny/g1"))

    router.history.back()
    await waitFor(() => expect(router.state.location.pathname).toBe("/skupiny/g1/sprava"))
  })

  it("after deactivating a group, back from its detail skips Správa skupiny", async () => {
    const { router } = await renderWithRouter(<SaveButton />, {
      url: "/skupiny/g1/sprava",
      previous: ["/skupiny", "/skupiny/g1"],
    })

    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))
    await waitFor(() => expect(router.state.location.pathname).toBe("/skupiny/g1"))

    router.history.back()
    await waitFor(() => expect(router.state.location.pathname).toBe("/skupiny/g1"))
    router.history.back()
    await waitFor(() => expect(router.state.location.pathname).toBe("/skupiny"))
  })
})
