import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SignInForm } from "@/features/auth/components/SignInForm"

describe("SignInForm", () => {
  it("says in Czech what is missing", async () => {
    const onSubmit = vi.fn()
    render(
      <SignInForm
        isLoading={false}
        onSubmit={onSubmit}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Přihlásit se" }))

    expect(await screen.findByText("Vyplň e-mail")).toBeInTheDocument()
    expect(screen.getByText("Vyplň heslo")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("sends the password exactly as typed, spaces included", async () => {
    const onSubmit = vi.fn()
    render(
      <SignInForm
        isLoading={false}
        onSubmit={onSubmit}
      />,
    )

    await userEvent.type(screen.getByLabelText("E-mail"), " jana@example.com ")
    await userEvent.type(screen.getByLabelText("Heslo"), " heslo 2026 ")
    await userEvent.click(screen.getByRole("button", { name: "Přihlásit se" }))

    expect(onSubmit).toHaveBeenCalledWith(
      { email: "jana@example.com", password: " heslo 2026 " },
      expect.anything(),
    )
  })

  it("shows the API's error, e.g. a wrong e-mail or password", () => {
    render(
      <SignInForm
        isLoading={false}
        errorMessage="Nesprávný e-mail nebo heslo."
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole("alert")).toHaveTextContent("Nesprávný e-mail nebo heslo.")
  })

  // as tall as the event form's (44 px, a comfortable tap), not the kit's 36/40 px
  it("has fields and a button the size of the event form's", () => {
    render(
      <SignInForm
        isLoading={false}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByLabelText("E-mail")).toHaveClass("h-11")
    expect(screen.getByLabelText("Heslo")).toHaveClass("h-11")
    expect(screen.getByRole("button", { name: "Přihlásit se" })).toHaveClass("h-11")
  })
})
