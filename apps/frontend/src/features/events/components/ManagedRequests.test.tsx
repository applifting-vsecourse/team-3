import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { EventRequest } from "@/features/events/api/eventSchemas"
import { ManagedRequests } from "@/features/events/components/ManagedRequests"

const jakub: EventRequest = {
  id: "u5",
  name: "Jakub Král",
  requestedAt: new Date("2026-10-23T15:30:00.000Z"),
  message: "Brass jsem hrál dvakrát, rád si dám znovu.",
}
const eva: EventRequest = {
  id: "u6",
  name: "Eva Malá",
  requestedAt: new Date("2026-10-23T16:00:00.000Z"),
  message: null,
}

const renderRequests = async (props: Partial<Parameters<typeof ManagedRequests>[0]> = {}) => {
  const onDecide = vi.fn<(r: EventRequest, d: "approve" | "reject") => Promise<unknown>>(() =>
    Promise.resolve(),
  )
  const onRetry = vi.fn()
  const view = await renderWithRouter(
    <ManagedRequests
      requests={[jakub, eva]}
      error={undefined}
      onRetry={onRetry}
      canDecide
      isFull={false}
      isDeciding={false}
      onDecide={onDecide}
      {...props}
    />,
  )
  return { onDecide, onRetry, rerender: view.rerender }
}

describe("ManagedRequests (#53)", () => {
  it("shows the applicant's message in quotes under them, none for a request without one (D-03, #175)", async () => {
    await renderRequests()

    const [jakubRow, evaRow] = screen.getAllByRole("listitem")
    expect(
      within(jakubRow!).getByText("„Brass jsem hrál dvakrát, rád si dám znovu.“"),
    ).toBeInTheDocument()
    expect(within(evaRow!).queryByText(/„/)).not.toBeInTheDocument()
  })

  it("lists the waiting requests, oldest first, with when they were sent", async () => {
    await renderRequests()

    expect(screen.getByRole("heading", { name: "Žádosti 2" })).toBeInTheDocument()
    const [first, second] = screen.getAllByRole("listitem")
    expect(within(first!).getByText("Jakub Král")).toBeInTheDocument()
    expect(within(first!).getByText("Žádost z 23. 10. v 17:30")).toBeInTheDocument()
    expect(within(second!).getByText("Eva Malá")).toBeInTheDocument()
  })

  it("approves each request on its own, at one click", async () => {
    const { onDecide } = await renderRequests()

    await userEvent.click(screen.getByRole("button", { name: "Schválit žádost: Jakub Král" }))

    expect(onDecide).toHaveBeenCalledExactlyOnceWith(jakub, "approve")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("rejecting asks first and says what the applicant will see (#185)", async () => {
    const { onDecide } = await renderRequests()

    await userEvent.click(screen.getByRole("button", { name: "Zamítnout žádost: Eva Malá" }))

    const dialog = screen.getByRole("dialog", { name: "Zamítnout žádost?" })
    expect(dialog).toHaveAccessibleDescription(
      "Eva Malá uvidí na detailu akce, že žádost byla zamítnuta, a novou na tuhle akci už poslat nepůjde.",
    )
    expect(onDecide).not.toHaveBeenCalled()
  })

  it("„Zpět“ leaves the request waiting (#185)", async () => {
    const { onDecide } = await renderRequests()

    await userEvent.click(screen.getByRole("button", { name: "Zamítnout žádost: Eva Malá" }))
    await userEvent.click(screen.getByRole("button", { name: "Zpět" }))

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(onDecide).not.toHaveBeenCalled()
  })

  it("confirming rejects that one request and closes the dialog (#185)", async () => {
    const { onDecide } = await renderRequests()

    await userEvent.click(screen.getByRole("button", { name: "Zamítnout žádost: Eva Malá" }))
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Zamítnout" }),
    )

    expect(onDecide).toHaveBeenCalledExactlyOnceWith(eva, "reject")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("a rejection that fails keeps the dialog open to try again (the page's toast says why)", async () => {
    const { onDecide } = await renderRequests()
    onDecide.mockRejectedValueOnce(new Error("Žádost už vyřízená."))

    await userEvent.click(screen.getByRole("button", { name: "Zamítnout žádost: Jakub Král" }))
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Zamítnout" }),
    )

    expect(onDecide).toHaveBeenCalledExactlyOnceWith(jakub, "reject")
    expect(screen.getByRole("dialog", { name: "Zamítnout žádost?" })).toBeInTheDocument()
  })

  it("while the rejection is on its way, it can't be confirmed twice", async () => {
    const { onDecide, rerender } = await renderRequests()
    await userEvent.click(screen.getByRole("button", { name: "Zamítnout žádost: Jakub Král" }))

    rerender(
      <ManagedRequests
        requests={[jakub, eva]}
        error={undefined}
        onRetry={vi.fn()}
        canDecide
        isFull={false}
        isDeciding
        onDecide={onDecide}
      />,
    )

    expect(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Zamítnout" }),
    ).toBeDisabled()
  })

  it("while a decision is on its way, no other can be sent (a second click would only fail)", async () => {
    await renderRequests({ isDeciding: true })

    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled()
  })

  it("while the rejection is on its way, the dialog can't be closed (review #262)", async () => {
    const { onDecide, rerender } = await renderRequests()
    await userEvent.click(screen.getByRole("button", { name: "Zamítnout žádost: Jakub Král" }))
    rerender(
      <ManagedRequests
        requests={[jakub, eva]}
        error={undefined}
        onRetry={vi.fn()}
        canDecide
        isFull={false}
        isDeciding
        onDecide={onDecide}
      />,
    )
    const dialog = screen.getByRole("dialog", { name: "Zamítnout žádost?" })

    expect(within(dialog).getByRole("button", { name: "Zpět" })).toBeDisabled()
    await userEvent.keyboard("{Escape}")
    expect(dialog).toBeInTheDocument()
    // a click on the overlay: the page under a modal dialog takes no pointer events
    await userEvent.setup({ pointerEventsCheck: 0 }).click(document.body)
    expect(dialog).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole("button", { name: "Zavřít" }))
    expect(screen.getByRole("dialog", { name: "Zamítnout žádost?" })).toBeInTheDocument()
  })

  it("an approval that fails leaves the request listed and no unhandled rejection (the page's toast says why)", async () => {
    const unhandled = vi.fn()
    process.on("unhandledRejection", unhandled)
    try {
      const decided = vi.fn()
      // not a vi.fn: Vitest attaches a handler to what a mock returns, which would
      // hide the very rejection this test looks for
      await renderRequests({
        onDecide: (request, decision) => {
          decided(request, decision)
          return Promise.reject(new Error("Akce je plná."))
        },
      })

      await userEvent.click(screen.getByRole("button", { name: "Schválit žádost: Jakub Král" }))
      // Node reports an unhandled rejection only after the pending callbacks
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(decided).toHaveBeenCalledExactlyOnceWith(jakub, "approve")
      expect(unhandled).not.toHaveBeenCalled()
      expect(screen.getByRole("button", { name: "Schválit žádost: Jakub Král" })).toBeEnabled()
    } finally {
      process.off("unhandledRejection", unhandled)
    }
  })

  it("a started event lists the requests without buttons, saying why", async () => {
    await renderRequests({ canDecide: false })

    expect(screen.getByText("Akce už začala, žádosti už vyřídit nejde.")).toBeInTheDocument()
    expect(screen.getByText("Jakub Král")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("a full event says why approving waits; rejecting still works", async () => {
    await renderRequests({ isFull: true })

    expect(
      screen.getByText("Akce je plná. Schválit půjde, až se uvolní místo."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Schválit žádost: Jakub Král" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Zamítnout žádost: Jakub Král" })).toBeEnabled()
  })

  it("says in one sentence that nothing is waiting", async () => {
    await renderRequests({ requests: [] })

    expect(screen.getByRole("heading", { name: "Žádosti 0" })).toBeInTheDocument()
    expect(screen.getByText("Žádné žádosti o účast teď nečekají.")).toBeInTheDocument()
  })

  it("shows that it is loading", async () => {
    await renderRequests({ requests: undefined })

    expect(screen.getByLabelText("Načítám žádosti")).toHaveAttribute("aria-busy", "true")
  })

  it("an error says so and offers a retry", async () => {
    const { onRetry } = await renderRequests({ requests: undefined, error: new Error("HTTP 500") })

    expect(screen.getByText("Žádosti se nepodařilo načíst")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("each applicant's name leads to their public profile, to see who is asking (#289)", async () => {
    await renderRequests()

    expect(screen.getByRole("link", { name: "Jakub Král" })).toHaveAttribute(
      "href",
      "/uzivatele/u5",
    )
    expect(screen.getByRole("link", { name: "Eva Malá" })).toHaveAttribute("href", "/uzivatele/u6")
  })
})
