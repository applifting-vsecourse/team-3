import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { EventRequest } from "@/features/events/api/eventSchemas"
import { ManagedRequests } from "@/features/events/components/ManagedRequests"

const jakub: EventRequest = {
  id: "u5",
  name: "Jakub Král",
  requestedAt: new Date("2026-10-23T15:30:00.000Z"),
}
const eva: EventRequest = {
  id: "u6",
  name: "Eva Malá",
  requestedAt: new Date("2026-10-23T16:00:00.000Z"),
}

const renderRequests = (props: Partial<Parameters<typeof ManagedRequests>[0]> = {}) => {
  const onDecide = vi.fn()
  const onRetry = vi.fn()
  render(
    <ManagedRequests
      requests={[jakub, eva]}
      error={undefined}
      onRetry={onRetry}
      isFull={false}
      decidingId={undefined}
      onDecide={onDecide}
      {...props}
    />,
  )
  return { onDecide, onRetry }
}

describe("ManagedRequests (#53)", () => {
  it("lists the waiting requests, oldest first, with when they were sent", () => {
    renderRequests()

    expect(screen.getByRole("heading", { name: "Žádosti 2" })).toBeInTheDocument()
    const [first, second] = screen.getAllByRole("listitem")
    expect(within(first!).getByText("Jakub Král")).toBeInTheDocument()
    expect(within(first!).getByText("Žádost z 23. 10. v 17:30")).toBeInTheDocument()
    expect(within(second!).getByText("Eva Malá")).toBeInTheDocument()
  })

  it("approves or rejects each request on its own", async () => {
    const { onDecide } = renderRequests()

    await userEvent.click(screen.getByRole("button", { name: "Schválit žádost: Jakub Král" }))
    await userEvent.click(screen.getByRole("button", { name: "Zamítnout žádost: Eva Malá" }))

    expect(onDecide).toHaveBeenNthCalledWith(1, jakub, "approve")
    expect(onDecide).toHaveBeenNthCalledWith(2, eva, "reject")
  })

  it("only the row being decided waits", () => {
    renderRequests({ decidingId: "u5" })

    expect(screen.getByRole("button", { name: "Schválit žádost: Jakub Král" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Zamítnout žádost: Jakub Král" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Schválit žádost: Eva Malá" })).toBeEnabled()
  })

  it("a full event says why approving waits; rejecting still works", () => {
    renderRequests({ isFull: true })

    expect(
      screen.getByText("Akce je plná. Schválit půjde, až se uvolní místo."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Schválit žádost: Jakub Král" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Zamítnout žádost: Jakub Král" })).toBeEnabled()
  })

  it("says in one sentence that nothing is waiting", () => {
    renderRequests({ requests: [] })

    expect(screen.getByRole("heading", { name: "Žádosti 0" })).toBeInTheDocument()
    expect(screen.getByText("Žádné žádosti o účast teď nečekají.")).toBeInTheDocument()
  })

  it("shows that it is loading", () => {
    renderRequests({ requests: undefined })

    expect(screen.getByLabelText("Načítám žádosti")).toHaveAttribute("aria-busy", "true")
  })

  it("an error says so and offers a retry", async () => {
    const { onRetry } = renderRequests({ requests: undefined, error: new Error("HTTP 500") })

    expect(screen.getByText("Žádosti se nepodařilo načíst")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
