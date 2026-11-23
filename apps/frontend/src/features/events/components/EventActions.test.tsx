import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { EventDetail } from "@/features/events/api/eventSchemas"
import { EventActions } from "@/features/events/components/EventActions"
import { anEventDetail } from "@/features/events/test/anEvent"

// before anEventDetail's start (Fri 23. 10. 2026, 17:30)
const now = new Date("2026-10-22T08:00:00.000Z")

const renderActions = async (
  overrides: Partial<EventDetail>,
  handlers: { onUnhide?: () => void } = {},
) =>
  renderWithRouter(
    <EventActions
      event={anEventDetail(overrides)}
      isCancelling={false}
      onCancel={() => Promise.resolve()}
      isModerating={false}
      onHide={() => Promise.resolve()}
      onUnhide={handlers.onUnhide ?? (() => undefined)}
      now={now}
    />,
  )

const buttonNames = () =>
  screen.queryAllByRole("button").map((button) => button.textContent?.trim())

describe("EventActions", () => {
  it("anybody else gets nothing", async () => {
    await renderActions({})

    expect(screen.queryByRole("link", { name: "Upravit" })).not.toBeInTheDocument()
    expect(buttonNames()).toEqual([])
  })

  it("the organizer edits and cancels, and does not deactivate", async () => {
    await renderActions({ canManage: true, canEdit: true })

    expect(screen.getByRole("link", { name: "Upravit" })).toHaveAttribute(
      "href",
      "/akce/e1/upravit",
    )
    expect(buttonNames()).toEqual(["Zrušit akci"])
  })

  describe("the superadmin (#308)", () => {
    const admin = { canEdit: true, canModerate: true }

    it("edits and deactivates a published event, and does not cancel it", async () => {
      await renderActions(admin)

      expect(screen.getByRole("link", { name: "Upravit" })).toBeInTheDocument()
      expect(buttonNames()).toEqual(["Deaktivovat"])
    })

    it("restores a deactivated event, which is not edited before", async () => {
      const onUnhide = vi.fn()
      await renderActions({ ...admin, status: "hidden" }, { onUnhide })

      expect(screen.queryByRole("link", { name: "Upravit" })).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole("button", { name: "Obnovit" }))
      expect(onUnhide).toHaveBeenCalled()
    })

    it("deactivates a past event too, without editing it", async () => {
      await renderActions({ ...admin, startsAt: new Date("2026-10-01T15:30:00.000Z") })

      expect(screen.queryByRole("link", { name: "Upravit" })).not.toBeInTheDocument()
      expect(buttonNames()).toEqual(["Deaktivovat"])
    })

    it("a cancelled event stays cancelled: nothing to do", async () => {
      await renderActions({ ...admin, status: "cancelled" })

      expect(screen.queryByRole("link", { name: "Upravit" })).not.toBeInTheDocument()
      expect(buttonNames()).toEqual([])
    })

    it("the superadmin's own event: edit, cancel and deactivate", async () => {
      await renderActions({ ...admin, canManage: true })

      expect(buttonNames()).toEqual(["Zrušit akci", "Deaktivovat"])
    })
  })
})
