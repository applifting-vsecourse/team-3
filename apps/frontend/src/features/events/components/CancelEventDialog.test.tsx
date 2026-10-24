import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { CancelEventDialog } from "@/features/events/components/CancelEventDialog"

const open = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Zrušit akci" }))
  return screen.getByRole("dialog", { name: "Zrušit akci?" })
}

describe("CancelEventDialog", () => {
  it("a reason is required; the error shows under the field", async () => {
    const onCancel = vi.fn(() => Promise.resolve())
    render(
      <CancelEventDialog
        isPending={false}
        onCancel={onCancel}
      />,
    )

    await open()
    await userEvent.click(screen.getAllByRole("button", { name: "Zrušit akci" }).at(-1)!)

    expect(await screen.findByText("Napiš, proč se akce ruší")).toBeInTheDocument()
    expect(onCancel).not.toHaveBeenCalled()
  })

  it("cancels with the trimmed reason and closes", async () => {
    const onCancel = vi.fn(() => Promise.resolve())
    render(
      <CancelEventDialog
        isPending={false}
        onCancel={onCancel}
      />,
    )

    await open()
    await userEvent.type(screen.getByLabelText("Důvod zrušení *"), "  Herna má zavřeno.  ")
    await userEvent.click(screen.getAllByRole("button", { name: "Zrušit akci" }).at(-1)!)

    expect(onCancel).toHaveBeenCalledWith("Herna má zavřeno.")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("stays open with the reason when the cancel fails", async () => {
    const onCancel = vi.fn(() => Promise.reject(new Error("Akce už začala, zrušit ji nejde.")))
    render(
      <CancelEventDialog
        isPending={false}
        onCancel={onCancel}
      />,
    )

    await open()
    await userEvent.type(screen.getByLabelText("Důvod zrušení *"), "Pozdě")
    await userEvent.click(screen.getAllByRole("button", { name: "Zrušit akci" }).at(-1)!)

    await waitFor(() => expect(onCancel).toHaveBeenCalled())
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByLabelText("Důvod zrušení *")).toHaveValue("Pozdě")
  })

  it("the confirming button is the destructive one, disabled while cancelling", async () => {
    render(
      <CancelEventDialog
        isPending
        onCancel={vi.fn()}
      />,
    )

    const dialog = await open()
    const confirm = dialog.querySelector('button[type="submit"]')!
    expect(confirm).toBeDisabled()
    expect(confirm.className).toContain("bg-destructive")
  })
})
