import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { SelfProfile } from "@/features/profile/api/profileSchemas"

import { ProfileEditPage } from "./ProfileEditPage"

const { api } = vi.hoisted(() => ({ api: { get: vi.fn() } }))
vi.mock("@/lib/api-client", () => ({ api, apiErrorCode: () => undefined }))

const profile: SelfProfile = {
  id: "owner",
  name: "Jana Nová",
  email: "jana@example.com",
  emailVerified: true,
  hasPassword: true,
  homeLocality: null,
  interests: [],
}
const asJson = (body: unknown) => ({ json: () => Promise.resolve(body) })

beforeEach(() => {
  api.get.mockReset()
  api.get.mockImplementation((path: string) => {
    if (path === "me/profile") return asJson(profile)
    if (path === "localities" || path === "activities") return asJson([])
    throw new Error(`unexpected ${path}`)
  })
})

describe("/profil/upravit (#178, Figma B-06)", () => {
  it("shows Údaje and Účet side by side, and leads back to the profile", async () => {
    await renderWithRouter(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ProfileEditPage
          viewerId="owner"
          onSaved={() => Promise.resolve()}
          // the auth feature's AccountForms, whose texts AccountForms.test.tsx checks
          accountContent={(account) => <p>Účet pro {account.email}</p>}
        />
      </QueryClientProvider>,
    )

    // the band with the way back (DESIGN.md › Layout)
    expect(
      screen.getByRole("heading", { level: 1, name: "Upravit profil" }).closest(".on-hero"),
    ).not.toBeNull()
    expect(screen.getByRole("link", { name: "Můj profil" })).toHaveAttribute("href", "/profil")

    const details = await screen.findByRole("region", { name: "Údaje" })
    expect(await within(details).findByLabelText("Jméno")).toHaveValue("Jana Nová")
    expect(within(details).getByRole("button", { name: "Uložit změny" })).toBeInTheDocument()

    const account = screen.getByRole("region", { name: "Účet" })
    expect(within(account).getByText("Účet pro jana@example.com")).toBeInTheDocument()
    // the two columns side by side from md (Figma B-06d), one under the other on a phone
    expect(details.parentElement).toHaveClass("md:grid-cols-2")
  })
})
