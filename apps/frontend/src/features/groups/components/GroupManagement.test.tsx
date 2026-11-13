import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GroupManagement } from "@/features/groups/components/GroupManagement"

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn() },
}))
vi.mock("@/lib/api-client", () => ({ api }))

// Figma D-07: Tomáš's group with two requests and five members
const members = {
  requests: [
    {
      userId: "u-jakub",
      name: "Jakub Král",
      role: "member",
      since: "2026-10-21T10:00:00Z",
      message: "Ahoj, v Pardubicích jsem hrál krajskou ligu v obraně. Rád bych se přidal.",
    },
    {
      userId: "u-petr",
      name: "Petr Holub",
      role: "member",
      since: "2026-10-22T10:00:00Z",
      message: null,
    },
  ],
  members: [
    {
      userId: "u-tomas",
      name: "Tomáš Dvořák",
      role: "admin",
      since: "2026-09-01T10:00:00Z",
      message: null,
    },
    {
      userId: "u-ondrej",
      name: "Ondřej Procházka",
      role: "member",
      since: "2026-09-02T10:00:00Z",
      message: null,
    },
  ],
}

const renderManagement = (isDesktop: boolean) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <GroupManagement
        groupId="g-florbal"
        isDesktop={isDesktop}
      />
    </QueryClientProvider>,
  )

beforeEach(() => {
  api.get.mockReset().mockReturnValue({ json: () => Promise.resolve(members) })
  api.post.mockReset().mockResolvedValue(undefined)
})

describe("GroupManagement", () => {
  it("a request shows the applicant's message in quotes under them (D-07, #175)", async () => {
    renderManagement(true)

    const requests = await screen.findByRole("region", { name: "Žádosti (2)" })
    const [jakub, petr] = within(requests).getAllByRole("listitem")
    expect(
      within(jakub!).getByText(
        "„Ahoj, v Pardubicích jsem hrál krajskou ligu v obraně. Rád bych se přidal.“",
      ),
    ).toBeInTheDocument()
    expect(within(petr!).queryByText(/„/)).not.toBeInTheDocument()
  })

  it("desktop shows requests and members at once, admins labelled", async () => {
    renderManagement(true)

    expect(await screen.findByRole("heading", { name: "Žádosti (2)" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Členové (2)" })).toBeInTheDocument()
    expect(screen.getByText("Jakub Král")).toBeInTheDocument()
    // when they asked, as with an event's requests (#304)
    expect(screen.getByText("Žádost z 21. 10. v 12:00")).toBeInTheDocument()
    expect(screen.getByText("Správce skupiny")).toBeInTheDocument()
    expect(screen.getByText("Člen skupiny")).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith("groups/g-florbal/members")
  })

  it("mobile puts them in tabs", async () => {
    renderManagement(false)

    const requestsTab = await screen.findByRole("tab", { name: "Žádosti (2)" })
    expect(requestsTab).toHaveAttribute("aria-selected", "true")
    expect(screen.getByText("Petr Holub")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("tab", { name: "Členové (2)" }))
    expect(screen.getByText("Ondřej Procházka")).toBeInTheDocument()
  })

  it("approving is one click (#304: the same as an event's requests)", async () => {
    renderManagement(true)

    await userEvent.click(
      await screen.findByRole("button", { name: "Schválit žádost: Jakub Král" }),
    )

    expect(api.post).toHaveBeenCalledExactlyOnceWith("groups/g-florbal/requests/u-jakub/approve")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("rejecting asks first and says what the applicant will see (#304, as D-03a)", async () => {
    renderManagement(true)

    await userEvent.click(
      await screen.findByRole("button", { name: "Zamítnout žádost: Petr Holub" }),
    )

    const dialog = screen.getByRole("dialog", { name: "Zamítnout žádost?" })
    expect(dialog).toHaveAccessibleDescription(
      "Petr Holub uvidí na stránce skupiny zase „Požádat o členství“ a o členství může požádat znovu.",
    )
    expect(api.post).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole("button", { name: "Zpět" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it("confirming rejects that one request and closes the dialog", async () => {
    renderManagement(true)

    await userEvent.click(
      await screen.findByRole("button", { name: "Zamítnout žádost: Petr Holub" }),
    )
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Zamítnout" }),
    )

    expect(api.post).toHaveBeenCalledExactlyOnceWith("groups/g-florbal/requests/u-petr/reject")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("a rejection that fails keeps the dialog open to try again", async () => {
    api.post.mockRejectedValueOnce(new Error("Žádost už vyřídil jiný správce."))
    renderManagement(true)

    await userEvent.click(
      await screen.findByRole("button", { name: "Zamítnout žádost: Petr Holub" }),
    )
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Zamítnout" }),
    )

    await waitFor(() => expect(api.post).toHaveBeenCalledOnce())
    expect(screen.getByRole("dialog", { name: "Zamítnout žádost?" })).toBeInTheDocument()
  })

  it("deciding one request leaves the others usable (review #318)", async () => {
    let finishJakub!: () => void
    let finishPetr!: () => void
    api.post
      .mockReturnValueOnce(new Promise<void>((resolve) => (finishJakub = resolve)))
      .mockReturnValueOnce(new Promise<void>((resolve) => (finishPetr = resolve)))
    renderManagement(true)

    await userEvent.click(
      await screen.findByRole("button", { name: "Schválit žádost: Jakub Král" }),
    )

    expect(screen.getByRole("button", { name: "Schválit žádost: Jakub Král" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Schválit žádost: Petr Holub" })).toBeEnabled()

    // a second row while the first is on its way: the first stays locked (review #318, 2nd round)
    await userEvent.click(screen.getByRole("button", { name: "Schválit žádost: Petr Holub" }))

    expect(screen.getByRole("button", { name: "Schválit žádost: Jakub Král" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Zamítnout žádost: Jakub Král" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Schválit žádost: Petr Holub" })).toBeDisabled()

    finishPetr()
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Schválit žádost: Petr Holub" })).toBeEnabled(),
    )
    expect(screen.getByRole("button", { name: "Schválit žádost: Jakub Král" })).toBeDisabled()
    finishJakub()
  })

  it("rejecting the last request closes the dialog and leaves the focus on the list, not <body> (review #318)", async () => {
    const onlyPetr = { ...members, requests: [members.requests[1]!] }
    api.get
      .mockReturnValueOnce({ json: () => Promise.resolve(onlyPetr) })
      .mockReturnValue({ json: () => Promise.resolve({ ...members, requests: [] }) })
    renderManagement(true)

    await userEvent.click(
      await screen.findByRole("button", { name: "Zamítnout žádost: Petr Holub" }),
    )
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Zamítnout" }),
    )

    expect(await screen.findByText("Žádné žádosti o členství teď nečekají.")).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await waitFor(() => expect(document.activeElement).not.toBe(document.body))
    // a named place, so a screen reader says where it is (review #318, 2nd round)
    expect(document.activeElement).toBe(screen.getByRole("region", { name: "Žádosti o členství" }))
    expect(document.activeElement).toContainElement(
      screen.getByText("Žádné žádosti o členství teď nečekají."),
    )
  })

  it("no requests: one sentence instead of an empty list", async () => {
    api.get.mockReturnValue({ json: () => Promise.resolve({ ...members, requests: [] }) })
    renderManagement(true)

    expect(await screen.findByText("Žádné žádosti o členství teď nečekají.")).toBeInTheDocument()
  })
})
