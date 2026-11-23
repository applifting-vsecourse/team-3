import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { router } from "@/app/router"
import { authKeys } from "@/lib/auth-keys"

import { authClient } from "@/features/auth/lib/auth-client"
import { pendingInvite, rememberInvite } from "@/features/invites/lib/invite"
import type { OnboardingResult } from "@/features/onboarding/components/OnboardingWizard"

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { getSession: vi.fn() },
}))
// the wizard has its own tests: here it only finishes, as after „Uložit a ukázat akce“
vi.mock("@/features/onboarding/components/OnboardingWizard", () => ({
  OnboardingWizard: ({
    onFinish,
  }: {
    onFinish: (result: OnboardingResult, hasSubmittedPreferences: boolean) => Promise<void>
  }) => (
    <button
      onClick={() =>
        void onFinish(
          {
            onboardingCompletedAt: "2026-11-23T10:00:00.000Z",
            localitySlug: "praha",
            hasInterests: true,
          },
          true,
        )
      }
    >
      Uložit a ukázat akce
    </button>
  ),
}))

const CODE = "q3Zr1hXkE0bLw9yT2vNcAa"
const newcomer = {
  id: "u1",
  email: "user@example.com",
  name: "Jana Nováková",
  emailVerified: true,
  ageConfirmedAt: "2026-01-01T00:00:00.000Z",
  onboardingCompletedAt: null,
}

const reply = (body: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  )

/** The API: who invites and the answer to it; every other page's request an empty list. */
const fetchMock = vi.fn((input: Request | string) => {
  const url = typeof input === "string" ? input : input.url
  if (url.endsWith(`/invites/${CODE}/accept`)) return reply({ state: "friends" })
  if (url.endsWith(`/invites/${CODE}`)) {
    return reply({ id: "u9", name: "Tomáš Novák", interests: [] })
  }
  return reply([])
})

async function renderOnboarding() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(authKeys.session(), { user: newcomer })
  vi.mocked(authClient.getSession).mockResolvedValue({
    data: { user: newcomer, session: {} },
    error: null,
  })
  const app = createRouter({
    ...router.options,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: ["/vitej"] }),
  })
  await app.load()
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={app} />
    </QueryClientProvider>,
  )
  return app
}

describe("the onboarding page (/vitej) and the invite (#406)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock)
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
    fetchMock.mockClear()
  })

  it("without an invite: finishing goes on to the events exactly as before", async () => {
    const app = await renderOnboarding()

    await userEvent.click(await screen.findByRole("button", { name: "Uložit a ukázat akce" }))

    await waitFor(() => expect(app.state.location.pathname).toBe("/akce"))
    expect(app.state.location.search).toEqual({ lokalita: "praha", vyber: "podle-zajmu" })
    expect(screen.queryByRole("heading", { name: /tě sem zve/ })).not.toBeInTheDocument()
    const urls = fetchMock.mock.calls.map(([input]) =>
      typeof input === "string" ? input : input.url,
    )
    expect(urls.some((url) => url.includes("invites"))).toBe(false)
  })

  it("with a remembered invite: the step comes after saving, then the events", async () => {
    rememberInvite(CODE)
    const app = await renderOnboarding()

    await userEvent.click(await screen.findByRole("button", { name: "Uložit a ukázat akce" }))

    expect(
      await screen.findByRole("heading", { name: "Tomáš Novák tě sem zve" }),
    ).toBeInTheDocument()
    expect(app.state.location.pathname).toBe("/vitej")

    await userEvent.click(screen.getByRole("button", { name: "Přidat do přátel" }))

    await waitFor(() => expect(app.state.location.pathname).toBe("/akce"))
    expect(pendingInvite(undefined)).toBeNull()
  })
})
