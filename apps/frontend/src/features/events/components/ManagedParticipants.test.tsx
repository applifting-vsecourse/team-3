import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { ManagedParticipants } from "@/features/events/components/ManagedParticipants"

describe("ManagedParticipants", () => {
  it("lists who is coming by name, with the count in the heading", async () => {
    await renderWithRouter(
      <ManagedParticipants
        participants={[
          { id: "u2", name: "Jana Malá" },
          { id: "u3", name: "Tomáš Novák" },
        ]}
        error={undefined}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole("heading", { name: "Účastníci 2" })).toBeInTheDocument()
    // in the order they got their place, as the API sends them
    const [first, second] = screen.getAllByRole("listitem")
    expect(within(first!).getByText("Jana Malá")).toBeInTheDocument()
    expect(within(second!).getByText("Tomáš Novák")).toBeInTheDocument()
  })

  it("says in one sentence that nobody is in yet", async () => {
    await renderWithRouter(
      <ManagedParticipants
        participants={[]}
        error={undefined}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole("heading", { name: "Účastníci 0" })).toBeInTheDocument()
    expect(screen.getByText("Až se někdo přihlásí, uvidíš ho tady.")).toBeInTheDocument()
  })

  it("on a cancelled event says nobody was in, not that someone may still come (#183)", async () => {
    await renderWithRouter(
      <ManagedParticipants
        participants={[]}
        error={undefined}
        onRetry={vi.fn()}
        isCancelled
      />,
    )

    expect(screen.getByText("Na akci nikdo nebyl přihlášený.")).toBeInTheDocument()
    expect(screen.queryByText("Až se někdo přihlásí, uvidíš ho tady.")).not.toBeInTheDocument()
  })

  it("shows that it is loading", async () => {
    await renderWithRouter(
      <ManagedParticipants
        participants={undefined}
        error={undefined}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByLabelText("Načítám účastníky")).toHaveAttribute("aria-busy", "true")
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
  })

  it("an error says so and offers a retry", async () => {
    const onRetry = vi.fn()
    await renderWithRouter(
      <ManagedParticipants
        participants={undefined}
        error={new Error("HTTP 500")}
        onRetry={onRetry}
      />,
    )

    expect(screen.getByText("Účastníky se nepodařilo načíst")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("each name leads to the participant's public profile (#289)", async () => {
    await renderWithRouter(
      <ManagedParticipants
        participants={[
          { id: "u2", name: "Jana Malá" },
          { id: "u3", name: "Tomáš Novák" },
        ]}
        error={undefined}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole("link", { name: "Jana Malá" })).toHaveAttribute("href", "/uzivatele/u2")
    expect(screen.getByRole("link", { name: "Tomáš Novák" })).toHaveAttribute(
      "href",
      "/uzivatele/u3",
    )
  })
})
