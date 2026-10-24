import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm"

describe("ForgotPasswordForm", () => {
  it("shows the problem under the field and doesn't send an invalid e-mail", async () => {
    const onSubmit = vi.fn()
    render(
      <ForgotPasswordForm
        isLoading={false}
        onSubmit={onSubmit}
      />,
    )

    await userEvent.type(screen.getByLabelText("E-mail"), "jakub@")
    await userEvent.click(screen.getByRole("button", { name: "Poslat odkaz" }))

    expect(await screen.findByText("Tohle není platný e-mail")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("sends the e-mail", async () => {
    const onSubmit = vi.fn()
    render(
      <ForgotPasswordForm
        isLoading={false}
        onSubmit={onSubmit}
      />,
    )

    await userEvent.type(screen.getByLabelText("E-mail"), "jakub.kral@example.com")
    await userEvent.click(screen.getByRole("button", { name: "Poslat odkaz" }))

    expect(onSubmit).toHaveBeenCalledWith({ email: "jakub.kral@example.com" }, expect.anything())
  })

  it("disables the button while sending", () => {
    render(
      <ForgotPasswordForm
        isLoading
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole("button", { name: "Poslat odkaz" })).toBeDisabled()
  })
})
