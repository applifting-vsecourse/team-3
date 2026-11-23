import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { AccountSummary } from "@/features/auth/api/accountApi"

import { DeleteAccountDialog } from "./DeleteAccountDialog"

const { deleteAccount } = vi.hoisted(() => ({ deleteAccount: vi.fn() }))
vi.mock("@/features/auth/hooks/useAccountActions", () => ({
  useDeleteAccount: () => useMutation({ mutationFn: deleteAccount }),
}))
// the API's refusal code, as ky's HTTPError carries it in `data`
vi.mock("@/lib/api-client", () => ({
  apiErrorCode: (error: unknown) => (error as { code?: string }).code,
}))

const refusal = (code: string, message: string) => Object.assign(new Error(message), { code })

const withPassword: AccountSummary = {
  hasPassword: true,
  confirmationPhrase: "smazat účet",
  groupsRunAlone: [],
  upcomingOrganizedCount: 0,
}

const open = async (summary: AccountSummary) => {
  await renderWithRouter(
    <QueryClientProvider client={new QueryClient()}>
      <DeleteAccountDialog summary={summary} />
    </QueryClientProvider>,
  )
  await userEvent.click(screen.getByRole("button", { name: "Smazat účet" }))
  return screen.getByRole("dialog", { name: "Smazat účet?" })
}

beforeEach(() => {
  deleteAccount.mockReset()
})

describe("Smazat účet (#64, B-080)", () => {
  it("says what happens before it does: cancelled events, groups to hand over, the anonymized name", async () => {
    const dialog = await open({
      ...withPassword,
      upcomingOrganizedCount: 2,
      groupsRunAlone: [{ id: "g1", name: "Běžci Letná" }],
    })
    expect(dialog).toHaveTextContent("Smazání nejde vrátit.")
    expect(dialog).toHaveTextContent("Tvoje nadcházející akce se zruší (2)")
    expect(dialog).toHaveTextContent("„Smazaný uživatel“")
    const groups = within(dialog).getByRole("list", { name: "Skupiny bez jiného správce" })
    expect(within(groups).getByRole("link", { name: "Běžci Letná" })).toHaveAttribute(
      "href",
      "/skupiny/g1",
    )
  })

  it("asks for the password and sends it as typed", async () => {
    deleteAccount.mockResolvedValue(undefined)
    const dialog = await open(withPassword)

    await userEvent.click(within(dialog).getByRole("button", { name: "Smazat účet" }))
    expect(await within(dialog).findByText("Napiš svoje heslo.")).toBeInTheDocument()
    expect(deleteAccount).not.toHaveBeenCalled()

    await userEvent.type(within(dialog).getByLabelText("Heslo"), "Tajne 123")
    await userEvent.click(within(dialog).getByRole("button", { name: "Smazat účet" }))
    expect(deleteAccount).toHaveBeenCalledWith({ password: "Tajne 123" }, expect.anything())
  })

  it("shows a wrong password from the server at the field", async () => {
    deleteAccount.mockRejectedValue(refusal("INVALID_PASSWORD", "Heslo nesedí. Zkus to znovu."))
    const dialog = await open(withPassword)

    const field = within(dialog).getByLabelText("Heslo")
    await userEvent.type(field, "spatne")
    await userEvent.click(within(dialog).getByRole("button", { name: "Smazat účet" }))

    expect(await within(dialog).findByText("Heslo nesedí. Zkus to znovu.")).toBeInTheDocument()
    expect(field).toHaveAttribute("aria-invalid", "true")
    expect(field).toHaveFocus()
    expect(within(dialog).queryByRole("alert")).toBeNull()
  })

  it("shows any other failure under the form, and the dialog stays", async () => {
    deleteAccount.mockRejectedValue(new Error("Nepodařilo se spojit se serverem."))
    const dialog = await open(withPassword)

    await userEvent.type(within(dialog).getByLabelText("Heslo"), "Tajne123")
    await userEvent.click(within(dialog).getByRole("button", { name: "Smazat účet" }))

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Nepodařilo se spojit se serverem.",
    )
  })

  it("asks an account without a password (Google) for the phrase instead", async () => {
    deleteAccount.mockResolvedValue(undefined)
    const dialog = await open({ ...withPassword, hasPassword: false })

    expect(within(dialog).queryByLabelText("Heslo")).toBeNull()
    const field = within(dialog).getByLabelText("Pro potvrzení napiš „smazat účet“")
    await userEvent.type(field, "smazat")
    await userEvent.click(within(dialog).getByRole("button", { name: "Smazat účet" }))
    expect(
      await within(dialog).findByText("Pro potvrzení napiš „smazat účet“."),
    ).toBeInTheDocument()
    expect(deleteAccount).not.toHaveBeenCalled()

    await userEvent.clear(field)
    await userEvent.type(field, "Smazat účet")
    await userEvent.click(within(dialog).getByRole("button", { name: "Smazat účet" }))
    expect(deleteAccount).toHaveBeenCalledWith({ confirmation: "Smazat účet" }, expect.anything())
  })

  it("tells a Google account with an old sign-in to sign in again, at the field", async () => {
    deleteAccount.mockRejectedValue(
      refusal(
        "REAUTHENTICATION_REQUIRED",
        "Kvůli bezpečnosti se odhlas a znovu přihlas přes Google. Pak účet smažeš.",
      ),
    )
    const dialog = await open({ ...withPassword, hasPassword: false })

    await userEvent.type(within(dialog).getByLabelText(/Pro potvrzení/), "smazat účet")
    await userEvent.click(within(dialog).getByRole("button", { name: "Smazat účet" }))

    expect(await within(dialog).findByText(/znovu přihlas přes Google/)).toBeInTheDocument()
  })
})
