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

const renderAction = async (
  event: Partial<EventDetail> = {},
  { viewer = jakub, isPending = false, now = before } = {},
) => {
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

    expect(screen.getByRole("button", { name: "Spravovat akci" })).toBeInTheDocument()
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

  it("with approval, a participant is told that (the request is #53)", async () => {
    await renderAction({ approvalMode: "approval" })

    expect(screen.getByText(/schvaluje organizátor/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Přijdu" })).not.toBeInTheDocument()
  })

  it("a waiting request can be withdrawn", async () => {
    await renderAction({ approvalMode: "approval", myParticipation: "pending" })

    expect(screen.getByText("Čeká na schválení")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Stáhnout žádost" })).toBeInTheDocument()
  })

  it("after the start there is nothing to join or leave", async () => {
    await renderAction(
      { myParticipation: "approved" },
      { now: new Date("2026-10-23T16:00:00.000Z") },
    )

    expect(screen.getByText("Akce už začala.")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("a cancelled event shows no action (its label is #52)", async () => {
    await renderAction({ status: "cancelled" })

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("joining in progress: „Přijdu“ is disabled", async () => {
    await renderAction({}, { isPending: true })

    expect(screen.getByRole("button", { name: "Přijdu" })).toBeDisabled()
  })
})
