import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SendAnnouncementButton } from "@/features/groups/components/SendAnnouncementButton"

const { api, toast } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock("@/lib/api-client", () => ({ api }))
vi.mock("sonner", () => ({ toast }))

const sent = {
  id: "an1",
  subject: "Přes svátky se nehraje",
  body: "Pauza do 6. 1.",
  createdAt: "2026-11-08T10:00:00Z",
  sender: { id: "u-tomas", name: "Tomáš Dvořák" },
}

const answer = (remainingToday: number | null) => ({
  json: () => Promise.resolve({ announcements: [], remainingToday }),
})

const renderButton = (queryClient = new QueryClient()) =>
  render(
    <QueryClientProvider client={queryClient}>
      <SendAnnouncementButton
        groupId="g-florbal"
        viewerId="u-tomas"
        memberCount={5}
      />
    </QueryClientProvider>,
  )

const openDialog = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Napsat členům" }))
  return screen.findByRole("dialog", { name: "Napsat členům" })
}

beforeEach(() => {
  api.get.mockReset().mockReturnValue(answer(3))
  api.post.mockReset().mockReturnValue({ json: () => Promise.resolve(sent) })
  toast.success.mockReset()
  toast.error.mockReset()
})

// Figma D-08, D-08d
describe("SendAnnouncementButton (#194)", () => {
  it("says who gets it — the other four members, not the admin — and what is left today", async () => {
    renderButton()
    const dialog = await openDialog()

    expect(
      within(dialog).getByText(
        "Oznámení přijde e-mailem všem 4 aktivním členům a uvidí ho na stránce skupiny. Čekající žadatelé ho nedostanou.",
      ),
    ).toBeInTheDocument()
    expect(
      await within(dialog).findByText("Dnes můžeš skupině poslat ještě 3 oznámení."),
    ).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith("groups/g-florbal/announcements")
  })

  it("sends the trimmed subject and text, closes and refreshes the announcements", async () => {
    const queryClient = new QueryClient()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    renderButton(queryClient)
    const dialog = await openDialog()

    await userEvent.type(within(dialog).getByLabelText("Předmět"), "  Přes svátky se nehraje ")
    await userEvent.type(within(dialog).getByLabelText("Text"), "Pauza do 6. 1.")
    await userEvent.click(within(dialog).getByRole("button", { name: "Odeslat" }))

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("groups/g-florbal/announcements", {
        json: { subject: "Přes svátky se nehraje", body: "Pauza do 6. 1." },
      }),
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(toast.success).toHaveBeenCalledWith("Oznámení je odeslané")
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["groups", "detail", "g-florbal", "announcements"],
    })
  })

  it("an empty dialog says what is missing under each field and sends nothing", async () => {
    renderButton()
    const dialog = await openDialog()

    await userEvent.type(within(dialog).getByLabelText("Předmět"), "   ")
    await userEvent.click(within(dialog).getByRole("button", { name: "Odeslat" }))

    expect(await within(dialog).findByText("Napiš předmět")).toBeInTheDocument()
    expect(within(dialog).getByText("Napiš text oznámení")).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it("a refusal (e.g. the daily limit) keeps the text and says why", async () => {
    api.post.mockReturnValue({
      json: () =>
        Promise.reject(new Error("Dnes už skupině další oznámení poslat nemůžeš. Zkus to zítra.")),
    })
    renderButton()
    const dialog = await openDialog()

    await userEvent.type(within(dialog).getByLabelText("Předmět"), "Pauza")
    await userEvent.type(within(dialog).getByLabelText("Text"), "Přes svátky se nehraje.")
    await userEvent.click(within(dialog).getByRole("button", { name: "Odeslat" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Dnes už skupině další oznámení poslat nemůžeš. Zkus to zítra.",
      ),
    )
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Text")).toHaveValue("Přes svátky se nehraje.")
  })

  it("with today's limit used up, it says so under the text", async () => {
    api.get.mockReturnValue(answer(0))
    renderButton()
    const dialog = await openDialog()

    expect(
      await within(dialog).findByText(
        "Dnes už skupině další oznámení poslat nemůžeš. Zkus to zítra.",
      ),
    ).toBeInTheDocument()
  })
})
