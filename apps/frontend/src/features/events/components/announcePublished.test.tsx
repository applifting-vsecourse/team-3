import { act, fireEvent, screen } from "@testing-library/react"
import { Toaster } from "sonner"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { announcePublished } from "@/features/events/components/announcePublished"

describe("announcePublished (#188)", () => {
  it("says the event is published and links on to Moje akce › Pořádám", async () => {
    const { router } = await renderWithRouter(<Toaster />, { url: "/akce/e1" })

    act(() => announcePublished())

    expect(await screen.findByText("Akce je zveřejněná.")).toBeInTheDocument()
    const link = screen.getByRole("link", { name: "Moje akce › Pořádám" })
    expect(link).toHaveAttribute("href", "/moje/akce?tab=poradam")

    // a plain click: sonner captures the pointer, which jsdom can't
    fireEvent.click(link)
    expect(router.state.location.href).toBe("/moje/akce?tab=poradam")
  })
})
