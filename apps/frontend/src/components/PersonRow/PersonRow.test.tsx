import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { PersonRow } from "./PersonRow"

describe("PersonRow profile link", () => {
  it("links a user name to the public profile", async () => {
    await renderWithRouter(
      <PersonRow
        name="Jana"
        userId="user-1"
      />,
    )
    expect(screen.getByRole("link", { name: "Jana" })).toHaveAttribute("href", "/uzivatele/user-1")
  })
  it("leads from the avatar to the same profile, without a second stop for a keyboard (#289)", async () => {
    const { container } = await renderWithRouter(
      <PersonRow
        name="Jana Nováková"
        userId="user-1"
      />,
    )
    // one link for assistive tech and the tab order: the name
    expect(screen.getAllByRole("link")).toHaveLength(1)
    const avatarLink = container.querySelector('a[aria-hidden="true"]')
    expect(avatarLink).toHaveAttribute("href", "/uzivatele/user-1")
    expect(avatarLink).toHaveAttribute("tabindex", "-1")
    expect(avatarLink).toHaveTextContent("JN")
  })
  it("keeps a group or an unspecified person as plain text", async () => {
    await renderWithRouter(
      <PersonRow
        name="Běžci"
        description="Skupina"
      />,
    )
    expect(screen.getByText("Běžci")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })
})
