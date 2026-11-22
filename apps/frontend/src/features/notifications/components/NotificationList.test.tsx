import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { NotificationList } from "@/features/notifications/components/NotificationList"

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn() } }))
vi.mock("@/lib/api-client", () => ({ api }))

const asJson = (body: unknown) => ({
  json: () => Promise.resolve(JSON.parse(JSON.stringify(body))),
})
const created = new Date(Date.now() - 5 * 60_000)
const items = [
  {
    id: "n2",
    type: "request_received",
    text: "Jana Nováková se chce zúčastnit akce „Deskovky ve středu“.",
    path: "/akce/e1/sprava",
    createdAt: created,
    readAt: null,
  },
  {
    id: "n1",
    type: "friend_request",
    text: "Petr Malý ti posílá žádost o přátelství.",
    path: "/profil/pratele?tab=zadosti",
    createdAt: created,
    readAt: created,
  },
]

const show = (onNavigate = vi.fn()) =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <NotificationList
        viewerId="jakub"
        onNavigate={onNavigate}
      />
    </QueryClientProvider>,
  )

describe("NotificationList (#86, Figma C-07)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.post.mockResolvedValue(undefined)
  })

  it("lists them newest first as links; the unread say so, not by colour alone", async () => {
    api.get.mockReturnValue(asJson({ items, unreadCount: 1 }))
    await show()

    const list = await screen.findByRole("list", { name: "Upozornění" })
    const [unread, read] = within(list).getAllByRole("link")
    expect(unread).toHaveAccessibleName(
      "Nepřečtené: Jana Nováková se chce zúčastnit akce „Deskovky ve středu“. před 5 min",
    )
    expect(unread).toHaveAttribute("href", "/akce/e1/sprava")
    expect(read).toHaveAccessibleName("Petr Malý ti posílá žádost o přátelství. před 5 min")
    expect(read).toHaveAttribute("href", "/profil/pratele?tab=zadosti")
    expect(api.get).toHaveBeenCalledWith("notifications")
  })

  it("opening an unread one marks it read and leads to its detail", async () => {
    api.get.mockReturnValue(asJson({ items, unreadCount: 1 }))
    const onNavigate = vi.fn()
    const { router } = await show(onNavigate)

    await userEvent.click(await screen.findByRole("link", { name: /Jana Nováková/ }))

    expect(api.post).toHaveBeenCalledWith("notifications/n2/read")
    expect(onNavigate).toHaveBeenCalledOnce()
    await waitFor(() => expect(router.state.location.pathname).toBe("/akce/e1/sprava"))
  })

  it("a read one isn't marked again", async () => {
    api.get.mockReturnValue(asJson({ items, unreadCount: 1 }))
    const { router } = await show()

    await userEvent.click(await screen.findByRole("link", { name: /Petr Malý/ }))

    expect(api.post).not.toHaveBeenCalled()
    await waitFor(() => expect(router.state.location.pathname).toBe("/profil/pratele"))
    expect(router.state.location.search).toEqual({ tab: "zadosti" })
  })

  it("nothing yet: says what would be here (Figma C-07a)", async () => {
    api.get.mockReturnValue(asJson({ items: [], unreadCount: 0 }))
    await show()

    expect(await screen.findByText("Zatím tu nic není")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Až se u tvých akcí, skupin nebo přátel něco stane, dáme ti vědět tady i e-mailem.",
      ),
    ).toBeInTheDocument()
  })

  it("an error says so and can be retried", async () => {
    api.get.mockReturnValueOnce({ json: () => Promise.reject(new Error("offline")) })
    api.get.mockReturnValue(asJson({ items, unreadCount: 1 }))
    await show()

    await userEvent.click(await screen.findByRole("button", { name: "Zkusit znovu" }))

    expect(await screen.findByRole("list", { name: "Upozornění" })).toBeInTheDocument()
  })
})
