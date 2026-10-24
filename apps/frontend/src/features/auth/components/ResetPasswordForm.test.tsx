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

    expect(await screen.findByText("Heslo musí mít aspoň 8 znaků")).toBeInTheDocument()
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

  it("shows the server's answer, e.g. an expired link", () => {
    render(
      <ResetPasswordForm
        isLoading={false}
        errorMessage="Invalid token"
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText("Invalid token")).toBeInTheDocument()
  })
})
