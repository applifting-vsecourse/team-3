import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { CreateEventButton } from "./CreateEventButton"

describe("CreateEventButton", () => {
  it("leads to the new event form", async () => {
    await renderWithRouter(<CreateEventButton />)

    expect(screen.getByRole("link", { name: "Založit akci" })).toHaveAttribute("href", "/akce/nova")
  })
})
