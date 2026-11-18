import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AgeConfirmationDialog } from "./AgeConfirmationDialog"

const state = vi.hoisted(() => ({
  user: null as null | { ageConfirmedAt: string | null },
  post: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock("@/features/auth/hooks/useSession", () => ({ useSession: () => ({ user: state.user }) }))
vi.mock("@/features/auth/hooks/useSignOut", () => ({
  useSignOut: () => ({ mutate: state.signOut, isPending: false, error: null }),
}))
vi.mock("@/lib/api-client", () => ({ api: { post: state.post } }))

const renderDialog = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AgeConfirmationDialog />
    </QueryClientProvider>,
  )

beforeEach(() => {
  state.user = null
  state.post.mockReset().mockReturnValue({ json: () => Promise.resolve({ confirmed: true }) })
  state.signOut.mockReset()
})

describe("age confirmation", () => {
  it("does not prompt visitors or confirmed accounts", () => {
    const view = renderDialog()
    expect(screen.queryByRole("dialog")).toBeNull()
    state.user = { ageConfirmedAt: "2026-11-01" }
    view.rerender(
      <QueryClientProvider client={new QueryClient()}>
        <AgeConfirmationDialog />
      </QueryClientProvider>,
    )
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("requires an explicit confirmation from an unconfirmed account", async () => {
    state.user = { ageConfirmedAt: null }
    renderDialog()
    expect(screen.getByRole("dialog", { name: "Potvrď svůj věk" })).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole("button", { name: "Potvrzuji, že mi je alespoň 18 let" }),
    )
    await waitFor(() =>
      expect(state.post).toHaveBeenCalledWith("me/confirm-age", { json: { ageConfirmed: true } }),
    )
  })

  it("lets an unconfirmed user sign out instead", async () => {
    state.user = { ageConfirmedAt: null }
    renderDialog()
    await userEvent.click(screen.getByRole("button", { name: "Odhlásit se" }))
    expect(state.signOut).toHaveBeenCalledOnce()
    expect(state.post).not.toHaveBeenCalled()
  })

  it("refreshes a protected page that was blocked before confirmation", async () => {
    state.user = { ageConfirmedAt: null }
    const loadEvents = vi
      .fn()
      .mockRejectedValueOnce(new Error("AGE_CONFIRMATION_REQUIRED"))
      .mockResolvedValue("Moje akce jsou načtené")
    function MyEvents() {
      const events = useQuery({ queryKey: ["me", "events"], queryFn: loadEvents })
      return <p>{events.isError ? "Akce se nepodařilo načíst" : events.data}</p>
    }
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <AgeConfirmationDialog />
        <MyEvents />
      </QueryClientProvider>,
    )
    expect(await screen.findByText("Akce se nepodařilo načíst")).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole("button", { name: "Potvrzuji, že mi je alespoň 18 let" }),
    )
    expect(await screen.findByText("Moje akce jsou načtené")).toBeInTheDocument()
  })

  it("shows a Czech explanation if confirmation fails", async () => {
    state.user = { ageConfirmedAt: null }
    state.post.mockReturnValue({ json: () => Promise.reject(new Error("network error at URL")) })
    renderDialog()
    await userEvent.click(
      screen.getByRole("button", { name: "Potvrzuji, že mi je alespoň 18 let" }),
    )
    expect(
      await screen.findByText("Potvrzení věku se nepovedlo. Zkus to prosím znovu."),
    ).toBeInTheDocument()
    expect(screen.queryByText(/network error/)).toBeNull()
  })
})
