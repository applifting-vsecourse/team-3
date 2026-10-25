import { useState } from "react"
import { act, screen, waitFor, within } from "@testing-library/react"
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
  const onJoin = vi.fn().mockResolvedValue(undefined)
  const onLeave = vi.fn().mockResolvedValue(undefined)
  const onVerifyEmail = vi.fn()
  await renderWithRouter(
    <ParticipationAction
      event={anEventDetail(event)}
      viewer={viewer}
      signInFrom={encodeURIComponent("/akce/e1")}
      isPending={isPending}
      onJoin={onJoin}
      onLeave={onLeave}
      onVerifyEmail={onVerifyEmail}
      now={now}
    />,
  )
  return { onJoin, onLeave, onVerifyEmail }
}

/** A request the test answers when it wants to. */
const aRequest = () => {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((resolveRequest, rejectRequest) => {
    resolve = resolveRequest
    reject = rejectRequest
  })
  return { promise, resolve, reject }
}

/** The page around the action: pending while the request is out, then the detail as the API answers. */
function Page({
  event,
  request,
  answer,
}: {
  event: Partial<EventDetail>
  request: () => Promise<void>
  answer: EventDetail["myParticipation"]
}) {
  const [detail, setDetail] = useState(() => anEventDetail(event))
  const [isPending, setIsPending] = useState(false)
  const send = async () => {
    setIsPending(true)
    try {
      await request()
      setDetail((current) => ({ ...current, myParticipation: answer }))
    } finally {
      setIsPending(false)
    }
  }
  return (
    <ParticipationAction
      event={detail}
      viewer={jakub}
      signInFrom={encodeURIComponent("/akce/e1")}
      isPending={isPending}
      onJoin={send}
      onLeave={send}
      now={before}
    />
  )
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
    // no e-mail comes with a change yet: say where it shows
    expect(screen.getByText("Změny akce uvidíš tady a v Mých akcích.")).toBeInTheDocument()
    // opening the page doesn't move the focus, only a change does
    expect(document.body).toHaveFocus()
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

  it("a full event: „Plno“, inactive and muted (outline, not lime)", async () => {
    await renderAction({ isFull: true, freeSpots: 0, approvedCount: 12 })

    expect(screen.getByRole("button", { name: "Plno" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Plno" })).toHaveAttribute("data-variant", "outline")
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

  it("a visitor sees „Plno“ on a full event, not a sign-in for a place there isn't", async () => {
    await renderAction({ isFull: true, freeSpots: 0, approvedCount: 12 }, { viewer: null })

    expect(screen.getByRole("button", { name: "Plno" })).toBeDisabled()
    expect(screen.queryByRole("link", { name: "Přihlásit se na akci" })).not.toBeInTheDocument()
    // who already has a place or a request still gets back to the event
    expect(screen.getByRole("link", { name: "Přihlas se k účtu" }).getAttribute("href")).toMatch(
      /^\/login\?from=/,
    )
  })

  it("a cancelled event still wins over „Plno“ for a visitor", async () => {
    const full = { isFull: true, freeSpots: 0, approvedCount: 12 }
    await renderAction({ ...full, status: "cancelled" }, { viewer: null })
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("…and once it has started, a visitor is told so", async () => {
    await renderAction(
      { isFull: true, freeSpots: 0, approvedCount: 12 },
      { viewer: null, now: new Date("2026-10-23T16:00:00.000Z") },
    )
    expect(screen.getByText("Akce už začala.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Plno" })).not.toBeInTheDocument()
  })

  it("an unverified user on a full event sees „Plno“, not a promise of a place after verifying", async () => {
    await renderAction(
      { isFull: true, freeSpots: 0, approvedCount: 12 },
      { viewer: { id: "u9", emailVerified: false } },
    )

    expect(screen.getByRole("button", { name: "Plno" })).toBeDisabled()
    expect(screen.queryByText(/až si ověříš e-mail/)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Ověřit e-mail" })).not.toBeInTheDocument()
  })

  it("a visitor is offered the sign-in that comes back to the event", async () => {
    await renderAction({}, { viewer: null })

    const link = screen.getByRole("link", { name: "Přihlásit se na akci" })
    expect(link.getAttribute("href")).toMatch(/^\/login\?from=/)
  })

  it("an unverified user is told to verify first and gets there from the bar, not „Přijdu“", async () => {
    const { onJoin, onVerifyEmail } = await renderAction(
      {},
      { viewer: { id: "u9", emailVerified: false } },
    )

    expect(screen.getByText("Na akci se přihlásíš, až si ověříš e-mail.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Přijdu" })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Ověřit e-mail" }))
    expect(onVerifyEmail).toHaveBeenCalledOnce()
    expect(onJoin).not.toHaveBeenCalled()
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

    expect(screen.getByText("Tvoje žádost o účast byla zamítnuta.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Poslat žádost" })).not.toBeInTheDocument()
  })

  it("a waiting request says where the decision shows, and can be withdrawn", async () => {
    await renderAction({ approvalMode: "approval", myParticipation: "pending" })

    expect(screen.getByText("Čeká na schválení")).toBeInTheDocument()
    expect(screen.getByText("Rozhodnutí uvidíš tady a v Mých akcích.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Stáhnout žádost" })).toBeInTheDocument()
  })

  it("after the start there is nothing to join or leave; a participant still sees they're in", async () => {
    await renderAction(
      { myParticipation: "approved" },
      { now: new Date("2026-10-23T16:00:00.000Z") },
    )

    expect(screen.getByText("Akce už začala. Máš na ní místo.")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("leaving in progress: „Odhlásit se“ can't be sent twice", async () => {
    await renderAction({ myParticipation: "approved" }, { isPending: true })

    expect(screen.getByRole("button", { name: "Odhlásit se" })).toBeDisabled()
  })

  it("a removed participant is told the place is gone, not that a request was rejected", async () => {
    await renderAction({ myParticipation: "removed" })

    expect(screen.getByText("Na akci už nemáš místo.")).toBeInTheDocument()
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

  it.each([
    ["approved", "Jdu", "Odhlásit se"],
    ["pending", "Čeká na schválení", "Stáhnout žádost"],
  ] as const)(
    "once %s, the state stands out and „%s“'s way back is quiet (ghost, not a bordered button)",
    async (myParticipation, state, wayBack) => {
      await renderAction({ approvalMode: "approval", myParticipation })

      expect(screen.getByText(state)).toHaveClass("font-semibold")
      expect(screen.getByRole("button", { name: wayBack })).toHaveAttribute("data-variant", "ghost")
    },
  )

  it("sending a request is still the one primary action", async () => {
    await renderAction({ approvalMode: "approval" })

    expect(screen.getByRole("button", { name: "Poslat žádost" })).toHaveAttribute(
      "data-variant",
      "default",
    )
  })

  it("the organizer going to their own event isn't told where its changes show", async () => {
    await renderAction({ myParticipation: "approved" }, { viewer: organizer })

    expect(screen.getByText("Jdu")).toBeInTheDocument()
    expect(screen.queryByText(/Změny akce uvidíš/)).not.toBeInTheDocument()
  })

  describe("while the request is on its way (as „Zrušit akci?“)", () => {
    it("the dialog waits for the answer, then the new state takes the focus", async () => {
      const request = aRequest()
      await renderWithRouter(
        <Page
          event={{ approvalMode: "approval" }}
          request={() => request.promise}
          answer="pending"
        />,
      )

      await userEvent.click(screen.getByRole("button", { name: "Poslat žádost" }))
      const dialog = screen.getByRole("dialog", { name: "Poslat žádost o účast?" })
      await userEvent.click(within(dialog).getByRole("button", { name: "Poslat žádost" }))
      // still open, and the request can't go twice
      expect(screen.getByRole("dialog", { name: "Poslat žádost o účast?" })).toBe(dialog)
      expect(within(dialog).getByRole("button", { name: "Poslat žádost" })).toBeDisabled()

      await act(async () => {
        request.resolve()
        await request.promise
      })

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      // not left on <body>: the button used is gone, its result is read out
      const state = screen.getByText("Čeká na schválení").parentElement!
      expect(state).toHaveFocus()
      expect(state).toHaveTextContent("Rozhodnutí uvidíš tady a v Mých akcích.")
    })

    it("a failed request keeps the dialog open to try again (the page's toast says why)", async () => {
      const request = aRequest()
      await renderWithRouter(
        <Page
          event={{ approvalMode: "approval" }}
          request={() => request.promise}
          answer="pending"
        />,
      )

      await userEvent.click(screen.getByRole("button", { name: "Poslat žádost" }))
      const dialog = screen.getByRole("dialog", { name: "Poslat žádost o účast?" })
      await userEvent.click(within(dialog).getByRole("button", { name: "Poslat žádost" }))
      await act(async () => {
        request.reject(new Error("Akce je plná."))
        await request.promise.catch(() => undefined)
      })

      expect(screen.getByRole("dialog", { name: "Poslat žádost o účast?" })).toBe(dialog)
      expect(within(dialog).getByRole("button", { name: "Poslat žádost" })).toBeEnabled()
      expect(screen.queryByText("Čeká na schválení")).not.toBeInTheDocument()
    })

    it("after „Přijdu“ the focus moves to „Jdu“, which says where changes show", async () => {
      await renderWithRouter(
        <Page
          event={{}}
          request={() => Promise.resolve()}
          answer="approved"
        />,
      )

      await userEvent.click(screen.getByRole("button", { name: "Přijdu" }))

      const state = (await screen.findByText("Jdu")).parentElement!
      await waitFor(() => expect(state).toHaveFocus())
      expect(state).toHaveTextContent("Změny akce uvidíš tady a v Mých akcích.")
    })

    it("after leaving the focus moves back to „Přijdu“", async () => {
      await renderWithRouter(
        <Page
          event={{ myParticipation: "approved" }}
          request={() => Promise.resolve()}
          answer={null}
        />,
      )

      await userEvent.click(screen.getByRole("button", { name: "Odhlásit se" }))
      const dialog = screen.getByRole("dialog", { name: "Odhlásit se z akce?" })
      await userEvent.click(within(dialog).getByRole("button", { name: "Odhlásit se" }))

      await waitFor(() => expect(screen.getByRole("button", { name: "Přijdu" })).toHaveFocus())
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })
})
