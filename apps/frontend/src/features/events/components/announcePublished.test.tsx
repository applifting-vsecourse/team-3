import { act, render, screen } from "@testing-library/react"
import { Toaster } from "sonner"
import { describe, expect, it } from "vitest"

import { announcePublished } from "@/features/events/components/announcePublished"

describe("announcePublished (#188)", () => {
  // PO 26. 11.: toasts without buttons; it says where the event is now
  it("says the event is published and where to find it, with no button", async () => {
    render(<Toaster />)

    act(() => announcePublished())

    expect(await screen.findByText("Akce je zveřejněná.")).toBeInTheDocument()
    expect(screen.getByText("Najdeš ji v Moje akce › Pořádám.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Pořádám/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })
})
