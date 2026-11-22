import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { BottomNav } from "@/components/BottomNav/BottomNav"
import { renderWithRouter } from "@/test/renderWithRouter"

describe("BottomNav", () => {
  // #370: „Přihlásit“ comes back to the page it was tapped on
  it("„Přihlásit“ carries the page to come back to", async () => {
    await renderWithRouter(
      <BottomNav
        isSignedIn={false}
        isSessionPending={false}
        signInFrom="/akce/abc"
      />,
    )

    expect(screen.getByRole("link", { name: "Přihlásit" })).toHaveAttribute(
      "href",
      `/login?from=${encodeURIComponent("/akce/abc")}`,
    )
  })

  it("without a page to come back to, plain /login", async () => {
    await renderWithRouter(
      <BottomNav
        isSignedIn={false}
        isSessionPending={false}
      />,
    )

    expect(screen.getByRole("link", { name: "Přihlásit" })).toHaveAttribute("href", "/login")
  })
})
