import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm"

const fill = async (password: string, again: string) => {
  await userEvent.type(screen.getByLabelText("Nové heslo"), password)
  await userEvent.type(screen.getByLabelText("Nové heslo znovu"), again)
  await userEvent.click(screen.getByRole("button", { name: "Nastavit heslo" }))
}

describe("ResetPasswordForm", () => {
  it("rejects a password shorter than 8 characters, under the field", async () => {
    const onSubmit = vi.fn()
    render(
      <ResetPasswordForm
        isLoading={false}
        onSubmit={onSubmit}
      />,
    )

    await fill("kratke", "kratke")

    expect(
      await screen.findByText("Heslo musí mít aspoň 10 znaků a obsahovat písmeno i číslici."),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("rejects passwords that don't match", async () => {
    const onSubmit = vi.fn()
    render(
      <ResetPasswordForm
        isLoading={false}
        onSubmit={onSubmit}
      />,
    )

    await fill("nove-heslo-2026", "nove-heslo-2027")

    expect(await screen.findByText("Hesla se neshodují")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("sends the new password", async () => {
    const onSubmit = vi.fn()
    render(
      <ResetPasswordForm
        isLoading={false}
        onSubmit={onSubmit}
      />,
    )

    await fill("nove-heslo-2026", "nove-heslo-2026")

    expect(onSubmit).toHaveBeenCalledWith("nove-heslo-2026")
  })

  it("shows the answer it is given, e.g. an expired link", () => {
    const message = "Odkaz je neplatný, nebo už vypršel. Pošli si prosím nový."
    render(
      <ResetPasswordForm
        isLoading={false}
        errorMessage={message}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText(message)).toBeInTheDocument()
  })

  // as tall as the event form's (44 px, a comfortable tap), not the kit's 36/40 px
  it("has fields and a button the size of the event form's", () => {
    render(
      <ResetPasswordForm
        isLoading={false}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByLabelText("Nové heslo")).toHaveClass("h-11")
    expect(screen.getByLabelText("Nové heslo znovu")).toHaveClass("h-11")
    expect(screen.getByRole("button", { name: "Nastavit heslo" })).toHaveClass("h-11")
  })
})
