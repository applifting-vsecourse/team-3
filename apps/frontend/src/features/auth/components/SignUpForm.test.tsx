import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SignUpForm } from "@/features/auth/components/SignUpForm"

const renderForm = () => {
  const onSubmit = vi.fn()
  render(
    <SignUpForm
      isLoading={false}
      onSubmit={onSubmit}
    />,
  )
  return { onSubmit }
}

const fill = async (password: string) => {
  await userEvent.type(screen.getByLabelText("Jméno"), "Jana Malá")
  await userEvent.type(screen.getByLabelText("E-mail"), "jana@example.com")
  await userEvent.type(screen.getByLabelText("Heslo"), password)
  await userEvent.click(screen.getByRole("button", { name: "Zaregistrovat se" }))
}

describe("SignUpForm (B-010)", () => {
  it("asks only for the name, the e-mail and the password", () => {
    renderForm()

    expect(screen.getAllByRole("textbox").map((input) => input.getAttribute("name"))).toEqual([
      "name",
      "email",
    ])
    expect(screen.getByLabelText("Heslo")).toHaveAttribute("type", "password")
  })

  it("a weak password is refused before sending, saying the rule", async () => {
    const { onSubmit } = renderForm()

    await fill("heslo-bez-cisla")

    expect(
      await screen.findByText("Heslo musí mít aspoň 10 znaků a obsahovat písmeno i číslici."),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("sends the name, the e-mail and the password", async () => {
    const { onSubmit } = renderForm()

    await fill("hobbyhub2026")

    expect(onSubmit).toHaveBeenCalledWith(
      { name: "Jana Malá", email: "jana@example.com", password: "hobbyhub2026" },
      expect.anything(),
    )
  })
})
