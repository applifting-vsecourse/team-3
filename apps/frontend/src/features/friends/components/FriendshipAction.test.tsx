import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { FriendshipState } from "@/features/friends/api/friendsSchemas"
import { FriendshipAction } from "@/features/friends/components/FriendshipAction"

const answer = (state: FriendshipState) => ({ json: () => Promise.resolve({ state }) })
const { api, toast } = vi.hoisted(() => ({
  api: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock("@/lib/api-client", () => ({ api }))
vi.mock("sonner", () => ({ toast }))

const show = (state: FriendshipState | null, onChanged = vi.fn().mockResolvedValue(undefined)) =>
  renderWithRouter(
    <QueryClientProvider client={new QueryClient()}>
      <FriendshipAction
        userId="petra"
        name="Petra Nováková"
        state={state}
        signInFrom="/uzivatele/petra"
        onChanged={onChanged}
      />
    </QueryClientProvider>,
  )

describe("FriendshipAction (Figma B-07 · Stavy tlačítka přátelství, #307)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("a visitor signs in first and comes back to the profile", async () => {
    await show(null)

    expect(screen.getByRole("link", { name: "Přidat do přátel" })).toHaveAttribute(
      "href",
      "/login?from=%2Fuzivatele%2Fpetra",
    )
  })

  it("no friend: „Přidat do přátel“ sends a request and refreshes the profile", async () => {
    api.post.mockReturnValue(answer("outgoing"))
    const onChanged = vi.fn().mockResolvedValue(undefined)
    await show("none", onChanged)

    await userEvent.click(screen.getByRole("button", { name: "Přidat do přátel" }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Žádost odeslána."))
    expect(api.post).toHaveBeenCalledWith("friends/petra")
    expect(onChanged).toHaveBeenCalled()
  })

  it("they asked me meanwhile: the request becomes a friendship, and the toast says so", async () => {
    api.post.mockReturnValue(answer("friends"))
    await show("none")

    await userEvent.click(screen.getByRole("button", { name: "Přidat do přátel" }))

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Petra Nováková je teď mezi přáteli."),
    )
  })

  it("my request waits: says so and can be cancelled", async () => {
    api.delete.mockReturnValue(answer("none"))
    await show("outgoing")

    expect(screen.getByText("Žádost odeslána")).toBeInTheDocument()
    expect(screen.getByText("Až ji přijme, uvidíš, kam chodí.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Přidat do přátel" })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zrušit žádost" }))

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("friends/petra"))
  })

  it("their request waits: accept or quietly reject, no „Přidat do přátel“", async () => {
    api.post.mockReturnValue(answer("friends"))
    api.patch.mockReturnValue(answer("none"))
    await show("incoming")

    expect(screen.getByText("Posílá ti žádost o přátelství")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Přidat do přátel" })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Odmítnout" }))
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("friends/petra", { json: { status: "rejected" } }),
    )
    expect(toast.success).toHaveBeenCalledWith("Žádost odmítnuta.")

    await userEvent.click(screen.getByRole("button", { name: "Přijmout žádost" }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("friends/petra"))
  })

  it("friends: removing asks first (B-07h), „Zpět“ keeps the friend", async () => {
    api.delete.mockReturnValue(answer("none"))
    await show("friends")

    expect(screen.getByText("Jste přátelé")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Odebrat z přátel" }))
    const dialog = screen.getByRole("dialog", { name: "Odebrat z přátel?" })
    expect(
      within(dialog).getByText(
        "Přestanete vidět, kam chodíte. Petra Nováková se o tom nedozví a přidat se můžete znovu.",
      ),
    ).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole("button", { name: "Zpět" }))
    expect(api.delete).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Odebrat z přátel" }))
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Odebrat" }),
    )
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Odebráno z přátel."))
    expect(api.delete).toHaveBeenCalledWith("friends/petra")
  })

  it("a refusal says why in the API's words", async () => {
    api.post.mockReturnValue({ json: () => Promise.reject(new Error("Žádost už je odeslaná.")) })
    await show("none")

    await userEvent.click(screen.getByRole("button", { name: "Přidat do přátel" }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Žádost už je odeslaná."))
  })

  it("over the day's limit of new requests (#84): the API's sentence, as in Najdi parťáka", async () => {
    api.post.mockReturnValue({
      json: () =>
        Promise.reject(
          Object.assign(new Error("Na dnešek máš přidáno dost. Další lidi můžeš přidat zítra."), {
            response: { status: 429 },
          }),
        ),
    })
    await show("none")

    await userEvent.click(screen.getByRole("button", { name: "Přidat do přátel" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Na dnešek máš přidáno dost. Další lidi můžeš přidat zítra.",
      ),
    )
  })

  it("nothing on one's own profile", async () => {
    const { container } = await show("self")

    expect(container).toBeEmptyDOMElement()
  })
})
