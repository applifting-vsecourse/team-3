import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { EventDetail } from "@/features/events/api/eventSchemas"
import { ParticipationAction, type Viewer } from "@/features/events/components/ParticipationAction"
import { anEventDetail } from "@/features/events/test/anEvent"

// the fixture starts Fri 23. 10. 2026 17:30 Prague time
const before = new Date("2026-10-23T08:00:00.000Z")
const jakub: Viewer = { id: "u9", emailVerified: true }
const organizer: Viewer = { id: "u1", emailVerified: true } // the fixture's organizer

type RenderOptions = { viewer?: Viewer | null; isPending?: boolean; now?: Date }

const renderAction = async (event: Partial<EventDetail> = {}, options: RenderOptions = {}) => {
  // a missing viewer is Jakub; an explicit null is a visitor
  const { viewer = jakub, isPending = false, now = before } = options
  const onJoin = vi.fn()
  const onLeave = vi.fn()
  await renderWithRouter(
    <ParticipationAction
      event={anEventDetail(event)}
      viewer={viewer}
      signInFrom={encodeURIComponent("/akce/e1")}
      isPending={isPending}
      onJoin={onJoin}
      onLeave={onLeave}
      now={now}
    />,
  )
  return { onJoin, onLeave }
}

describe("ParticipationAction", () => {
  it("an event without approval: „Přijdu“ joins", async () => {
    const { onJoin } = await renderAction()

    await userEvent.click(screen.getByRole("button", { name: "Přijdu" }))
    expect(onJoin).toHaveBeenCalledOnce()
  })

  it("joined: „Jdu“ and „Odhlásit se“, which asks before leaving", async () => {
    const { onLeave } = await renderAction({ myParticipation: "approved" })

    expect(screen.getByText("Jdu")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Odhlásit se" }))
    const dialog = screen.getByRole("dialog", { name: "Odhlásit se z akce?" })
    expect(onLeave).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole("button", { name: "Odhlásit se" }))
    expect(onLeave).toHaveBeenCalledOnce()
  })

  it("„Zpět“ in the dialog keeps the place", async () => {
    const { onLeave } = await renderAction({ myParticipation: "approved" })

    await userEvent.click(screen.getByRole("button", { name: "Odhlásit se" }))
    await userEvent.click(screen.getByRole("button", { name: "Zpět" }))
    expect(onLeave).not.toHaveBeenCalled()
  })

  it("a full event: „Plno“, inactive", async () => {
    await renderAction({ isFull: true, freeSpots: 0, approvedCount: 12 })

    expect(screen.getByRole("button", { name: "Plno" })).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Přijdu" })).not.toBeInTheDocument()
  })

  it("the organizer sees „Spravovat akci“ and next to it „Přijdu“, even with approval", async () => {
    const { onJoin } = await renderAction({ approvalMode: "approval" }, { viewer: organizer })

    expect(screen.getByRole("link", { name: "Spravovat akci" })).toHaveAttribute(
      "href",
      "/akce/e1/sprava",
    )
    await userEvent.click(screen.getByRole("button", { name: "Přijdu" }))
    expect(onJoin).toHaveBeenCalledOnce()
  })

  it("a visitor is offered the sign-in that comes back to the event", async () => {
    await renderAction({}, { viewer: null })

    const link = screen.getByRole("link", { name: "Přihlásit se na akci" })
    expect(link.getAttribute("href")).toMatch(/^\/login\?from=/)
  })

  it("an unverified user is told to verify first, with no button", async () => {
    await renderAction({}, { viewer: { id: "u9", emailVerified: false } })

    expect(screen.getByText(/až ověříte svůj e-mail/)).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("with approval, „Poslat žádost“ asks first and then sends the request (A-05a, #53)", async () => {
    const { onJoin } = await renderAction({ approvalMode: "approval" })

    expect(screen.queryByRole("button", { name: "Přijdu" })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Poslat žádost" }))
    const dialog = screen.getByRole("dialog", { name: "Poslat žádost o účast?" })
    expect(onJoin).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole("button", { name: "Poslat žádost" }))
    expect(onJoin).toHaveBeenCalledOnce()
  })

  it("a request can be called off before it's sent", async () => {
    const { onJoin } = await renderAction({ approvalMode: "approval" })

    await userEvent.click(screen.getByRole("button", { name: "Poslat žádost" }))
    await userEvent.click(screen.getByRole("button", { name: "Zpět" }))

    expect(onJoin).not.toHaveBeenCalled()
  })

  it("a full event with approval takes no request: „Plno“", async () => {
    await renderAction({ approvalMode: "approval", isFull: true, freeSpots: 0, approvedCount: 12 })

    expect(screen.getByRole("button", { name: "Plno" })).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Poslat žádost" })).not.toBeInTheDocument()
  })

  it("a rejected request is told so and can't be sent again", async () => {
    await renderAction({ approvalMode: "approval", myParticipation: "rejected" })

    expect(screen.getByText("Organizátor vaši účast zamítl.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Poslat žádost" })).not.toBeInTheDocument()
  })

  it("a waiting request can be withdrawn", async () => {
    await renderAction({ approvalMode: "approval", myParticipation: "pending" })

    expect(screen.getByText("Čeká na schválení")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Stáhnout žádost" })).toBeInTheDocument()
  })

  it("after the start there is nothing to join or leave; a participant still sees they're in", async () => {
    await renderAction(
      { myParticipation: "approved" },
      { now: new Date("2026-10-23T16:00:00.000Z") },
    )

    expect(screen.getByText("Akce už začala. Jste přihlášení.")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("leaving in progress: „Odhlásit se“ can't be sent twice", async () => {
    await renderAction({ myParticipation: "approved" }, { isPending: true })

    expect(screen.getByRole("button", { name: "Odhlásit se" })).toBeDisabled()
  })

  it("a removed participant is told so, not that they were rejected", async () => {
    await renderAction({ myParticipation: "removed" })

    expect(screen.getByText("Organizátor vás z akce odebral.")).toBeInTheDocument()
  })

  it("a cancelled event shows no action (its label is #52)", async () => {
    await renderAction({ status: "cancelled" })

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("the organizer still gets to the management page once the event is cancelled", async () => {
    await renderAction({ status: "cancelled" }, { viewer: organizer })

    expect(screen.getByRole("link", { name: "Spravovat akci" })).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("…and once it has started", async () => {
    await renderAction({}, { viewer: organizer, now: new Date("2026-10-23T16:00:00.000Z") })

    expect(screen.getByRole("link", { name: "Spravovat akci" })).toBeInTheDocument()
    expect(screen.getByText("Akce už začala.")).toBeInTheDocument()
  })

  it("joining in progress: „Přijdu“ is disabled", async () => {
    await renderAction({}, { isPending: true })

    expect(screen.getByRole("button", { name: "Přijdu" })).toBeDisabled()
  })
})
