import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { NotificationBell } from "@/features/notifications/components/NotificationBell"

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn() } }))
vi.mock("@/lib/api-client", () => ({ api }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const asJson = (body: unknown) => ({
  json: () => Promise.resolve(JSON.parse(JSON.stringify(body))),
})
const answer = (count: number) =>
  api.get.mockImplementation((path: string) =>
    asJson(
      path === "notifications/unread-count"
        ? { count }
        : {
            items: [
              {
                id: "n1",
                type: "event_cancelled",
                text: "Akce „Deskovky ve středu“ byla zrušena.",
                path: "/akce/e1",
                createdAt: new Date(),
                readAt: null,
              },
            ],
            unreadCount: count,
          },
    ),
  )

const show = () =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <NotificationBell viewerId="jakub" />
    </QueryClientProvider>,
  )

describe("NotificationBell (#86, Figma Zvonek)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.post.mockResolvedValue(undefined)
  })

  it("on a phone leads to /upozorneni, named with how many are unread", async () => {
    answer(3)
    await show()

    const link = await screen.findByRole("link", { name: "Upozornění, 3 nepřečtená" })
    expect(link).toHaveAttribute("href", "/upozorneni")
    expect(link).toHaveTextContent("3")
  })

  it("over 9 the badge says „9+“; without unread there is no number", async () => {
    answer(12)
    const { unmount } = await show()
    expect(
      await screen.findByRole("link", { name: "Upozornění, 12 nepřečtených" }),
    ).toHaveTextContent("9+")
    unmount()

    answer(0)
    await show()
    expect(await screen.findByRole("link", { name: "Upozornění" })).toHaveTextContent("")
  })

  it("on desktop opens the panel with the list and „Označit vše jako přečtené“", async () => {
    answer(1)
    await show()

    await userEvent.click(await screen.findByRole("button", { name: "Upozornění, 1 nepřečtené" }))

    expect(await screen.findByRole("heading", { name: "Upozornění" })).toBeInTheDocument()
    expect(await screen.findByRole("link", { name: /Deskovky ve středu/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Označit vše jako přečtené" }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("notifications/read-all"))
  })

  it("opening the panel brings the bell's number up to the list's (review #398)", async () => {
    api.get.mockImplementation((path: string) =>
      asJson(path === "notifications/unread-count" ? { count: 1 } : { items: [], unreadCount: 3 }),
    )
    await show()

    await userEvent.click(await screen.findByRole("button", { name: "Upozornění, 1 nepřečtené" }))

    expect(
      await screen.findByRole("button", { name: "Upozornění, 3 nepřečtená" }),
    ).toBeInTheDocument()
  })

  it("the list isn't asked for until the panel opens", async () => {
    answer(2)
    await show()

    await screen.findByRole("link", { name: "Upozornění, 2 nepřečtená" })
    expect(api.get).not.toHaveBeenCalledWith("notifications")
  })
})
