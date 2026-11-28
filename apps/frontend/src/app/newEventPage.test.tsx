import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { router } from "@/app/router"
import { authKeys } from "@/lib/auth-keys"

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { getSession: vi.fn().mockResolvedValue({ data: null, error: null }) },
}))

const user = {
  id: "u1",
  email: "petra@example.com",
  name: "Petra Nováková",
  emailVerified: true,
  ageConfirmedAt: "2026-01-01T00:00:00.000Z",
}
const localities = [
  { id: "l-praha", slug: "praha", name: "Praha", parentId: null, lat: 50.08, lng: 14.44 },
  { id: "l-brno", slug: "brno", name: "Brno", parentId: null, lat: 49.2, lng: 16.61 },
]
const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } })

/** /akce/nova for a signed-in user; the catalog has Praha and Brno. */
async function renderNewEvent() {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const href = input instanceof Request ? input.url : String(input)
      if (/\/localities(\?|$)/.test(href)) return Promise.resolve(json(localities))
      return Promise.resolve(json([]))
    }),
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(authKeys.session(), { user })
  const app = createRouter({
    ...router.options,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: ["/akce/nova"] }),
  })
  await app.load()
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={app} />
    </QueryClientProvider>,
  )
}

beforeEach(() =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
)
afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

// QA-16: the form started with no locality and its map in Praha, also for someone in Brno
describe("/akce/nova", () => {
  it("starts in the locality the lists show (picked on /akce), not empty", async () => {
    localStorage.setItem("hobbyhub.lokalita", "brno")
    await renderNewEvent()

    expect(await screen.findByRole("heading", { name: "Nová akce" })).toBeInTheDocument()
    const field = await screen.findByRole("combobox", { name: /Lokalita/ })
    expect(field).toHaveTextContent("Brno")
  })
})
