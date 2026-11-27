import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { HideEventDialog } from "@/features/events/components/HideEventDialog"

const open = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Deaktivovat" }))
  return screen.getByRole("dialog", { name: "Deaktivovat akci?" })
}

const submit = () => userEvent.click(screen.getAllByRole("button", { name: "Deaktivovat" }).at(-1)!)

describe("HideEventDialog (#308)", () => {
  it("a reason is required; the error shows under the field", async () => {
    const onHide = vi.fn(() => Promise.resolve())
    render(
      <HideEventDialog
        isPending={false}
        onHide={onHide}
      />,
    )

    await open()
    await userEvent.type(screen.getByLabelText("Důvod deaktivace *"), "   ")
    await submit()

    expect(await screen.findByText("Napiš, proč akci deaktivuješ")).toBeInTheDocument()
    expect(onHide).not.toHaveBeenCalled()
  })

  it("the confirming button is not destructive: it can be undone (review #380)", async () => {
    render(
      <HideEventDialog
        isPending={false}
        onHide={() => Promise.resolve()}
      />,
    )

    await open()

    const confirm = screen.getAllByRole("button", { name: "Deaktivovat" }).at(-1)!
    expect(confirm).toHaveAttribute("data-variant", "default")
  })

  it("says it is no cancellation: nobody is e-mailed and it can be restored", async () => {
    render(
      <HideEventDialog
        isPending={false}
        onHide={() => Promise.resolve()}
      />,
    )

    const dialog = await open()

    expect(dialog).toHaveTextContent("Nikomu nepřijde e-mail a akci jde kdykoli obnovit.")
  })

  it("deactivates with the trimmed reason and closes", async () => {
    const onHide = vi.fn(() => Promise.resolve())
    render(
      <HideEventDialog
        isPending={false}
        onHide={onHide}
      />,
    )

    await open()
    await userEvent.type(screen.getByLabelText("Důvod deaktivace *"), "  Podvodná akce.  ")
    await submit()

    expect(onHide).toHaveBeenCalledWith("Podvodná akce.")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("stays open with the reason when the deactivation fails", async () => {
    const onHide = vi.fn(() => Promise.reject(new Error("Zrušenou akci deaktivovat nejde.")))
    render(
      <HideEventDialog
        isPending={false}
        onHide={onHide}
      />,
    )

    await open()
    await userEvent.type(screen.getByLabelText("Důvod deaktivace *"), "Podvod")
    await submit()

    await waitFor(() => expect(onHide).toHaveBeenCalled())
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByLabelText("Důvod deaktivace *")).toHaveValue("Podvod")
  })
})
