import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SendEventMessageButton } from "@/features/events/components/SendEventMessageButton"

const { api, toast } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock("@/lib/api-client", () => ({ api }))
vi.mock("sonner", () => ({ toast }))

const sent = {
  id: "m1",
  subject: "Hrajeme u menšího stolu",
  body: "Sraz v 17:50 u vchodu.",
  createdAt: "2026-11-08T10:00:00Z",
  sender: { id: "u-petra", name: "Petra Nováková" },
}

const answer = (remainingToday: number | null) => ({
  json: () => Promise.resolve({ messages: [], total: 0, remainingToday }),
})

const renderButton = (queryClient = new QueryClient(), recipientCount: number | undefined = 4) =>
  render(
    <QueryClientProvider client={queryClient}>
      <SendEventMessageButton
        eventId="e17"
        viewerId="u-petra"
        recipientCount={recipientCount}
      />
    </QueryClientProvider>,
  )

const openDialog = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Napsat účastníkům" }))
  return screen.findByRole("dialog", { name: "Napsat účastníkům" })
}

beforeEach(() => {
  api.get.mockReset().mockReturnValue(answer(10))
  api.post.mockReset().mockReturnValue({ json: () => Promise.resolve(sent) })
  toast.success.mockReset()
  toast.error.mockReset()
})

// Figma D-04, D-04d
describe("SendEventMessageButton (#176)", () => {
  it("says who gets it — the four approved participants — and what is left today", async () => {
    renderButton()
    const dialog = await openDialog()

    expect(
      within(dialog).getByText(
        "Zpráva přijde e-mailem všem 4 schváleným účastníkům a uvidí ji na detailu akce.",
      ),
    ).toBeInTheDocument()
    expect(
      await within(dialog).findByText("Dnes můžeš k akci poslat ještě 10 zpráv."),
    ).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith("events/e17/messages")
  })

  it("nobody approved yet: says the message waits on the detail", async () => {
    renderButton(new QueryClient(), 0)
    const dialog = await openDialog()

    expect(
      within(dialog).getByText(/Akce zatím nemá žádné schválené účastníky/),
    ).toBeInTheDocument()
  })

  it("sends the trimmed subject and text, closes and refreshes the messages", async () => {
    const queryClient = new QueryClient()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    renderButton(queryClient)
    const dialog = await openDialog()

    await userEvent.type(within(dialog).getByLabelText("Předmět"), "  Hrajeme u menšího stolu ")
    await userEvent.type(within(dialog).getByLabelText("Text"), "Sraz v 17:50 u vchodu.")
    await userEvent.click(within(dialog).getByRole("button", { name: "Odeslat" }))

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("events/e17/messages", {
        json: { subject: "Hrajeme u menšího stolu", body: "Sraz v 17:50 u vchodu." },
      }),
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(toast.success).toHaveBeenCalledWith("Zpráva je odeslaná")
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["events", "detail", "e17", "u-petra", "messages"],
    })
  })

  it("an empty dialog says what is missing under each field and sends nothing", async () => {
    renderButton()
    const dialog = await openDialog()

    await userEvent.type(within(dialog).getByLabelText("Předmět"), "   ")
    await userEvent.click(within(dialog).getByRole("button", { name: "Odeslat" }))

    expect(await within(dialog).findByText("Napiš předmět")).toBeInTheDocument()
    expect(within(dialog).getByText("Napiš text zprávy")).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it("a too long subject is refused before sending", async () => {
    renderButton()
    const dialog = await openDialog()

    await userEvent.click(within(dialog).getByLabelText("Předmět"))
    await userEvent.paste("a".repeat(121))
    await userEvent.type(within(dialog).getByLabelText("Text"), "Text")
    await userEvent.click(within(dialog).getByRole("button", { name: "Odeslat" }))

    expect(await within(dialog).findByText("Předmět může mít nejvýš 120 znaků")).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it("a refusal (e.g. the daily limit) keeps the text, says why and refreshes the event", async () => {
    const queryClient = new QueryClient()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    api.post.mockReturnValue({
      json: () =>
        Promise.reject(new Error("Dnes už k akci další zprávu poslat nemůžeš. Zkus to zítra.")),
    })
    renderButton(queryClient)
    const dialog = await openDialog()

    await userEvent.type(within(dialog).getByLabelText("Předmět"), "Sraz")
    await userEvent.type(within(dialog).getByLabelText("Text"), "U vchodu.")
    await userEvent.click(within(dialog).getByRole("button", { name: "Odeslat" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Dnes už k akci další zprávu poslat nemůžeš. Zkus to zítra.",
      ),
    )
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Text")).toHaveValue("U vchodu.")
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["events", "detail", "e17", "u-petra"] })
  })

  it("with today's limit used up, it says so under the text and „Odeslat“ is off", async () => {
    api.get.mockReturnValue(answer(0))
    renderButton()
    const dialog = await openDialog()

    expect(
      await within(dialog).findByText("Dnes už k akci další zprávu poslat nemůžeš. Zkus to zítra."),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: "Odeslat" })).toBeDisabled()
  })
})
