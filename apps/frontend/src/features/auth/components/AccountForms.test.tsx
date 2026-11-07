import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { authErrorMessage, AuthRequestError } from "@/features/auth/lib/auth-errors"

import { AccountForms, ChangeEmailForm, ChangePasswordForm } from "./AccountForms"

const mutations = vi.hoisted(() => ({ password: vi.fn(), email: vi.fn() }))
vi.mock("@/features/auth/hooks/useAccountMutations", () => ({
  useChangePassword: () => ({
    mutateAsync: mutations.password,
    isPending: false,
    isSuccess: false,
    error: null,
  }),
  useChangeEmail: () => ({
    mutateAsync: mutations.email,
    isPending: false,
    isSuccess: false,
    error: null,
  }),
}))
vi.mock("@/features/auth/components/PasswordStrength", () => ({ PasswordStrength: () => null }))
const profile = {
  id: "owner",
  name: "Jana Nová",
  email: "old@example.com",
  emailVerified: true,
  hasPassword: true,
  homeLocality: null,
  interests: [],
}
beforeEach(() => {
  vi.clearAllMocks()
  mutations.password.mockResolvedValue(undefined)
  mutations.email.mockResolvedValue(undefined)
})

describe("profile account forms (#178)", () => {
  it("Účet on /profil/upravit: the password form, then the e-mail form (Figma B-06)", () => {
    render(<AccountForms profile={profile} />)
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Změna hesla",
      "Změna e-mailu",
    ])
    expect(screen.getByLabelText("Současné heslo")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Změnit heslo" })).toBeInTheDocument()
    expect(screen.getByText("old@example.com")).toBeInTheDocument()
    expect(screen.getByLabelText("Nový e-mail")).toBeInTheDocument()
  })
  it("refuses mismatched passwords before calling the API", async () => {
    const user = userEvent.setup()
    render(<ChangePasswordForm profile={profile} />)
    await user.type(screen.getByLabelText("Současné heslo"), "old-password-123")
    await user.type(screen.getByLabelText("Nové heslo", { exact: true }), "new-password-456")
    await user.type(screen.getByLabelText("Nové heslo znovu"), "different-password-789")
    await user.click(screen.getByRole("button", { name: "Změnit heslo" }))
    expect(await screen.findByText("Hesla se neshodují.")).toBeInTheDocument()
    expect(mutations.password).not.toHaveBeenCalled()
  })
  it("submits old/new passwords and clears password inputs after success", async () => {
    const user = userEvent.setup()
    render(<ChangePasswordForm profile={profile} />)
    await user.type(screen.getByLabelText("Současné heslo"), "old-password-123")
    await user.type(screen.getByLabelText("Nové heslo", { exact: true }), "new-password-456")
    await user.type(screen.getByLabelText("Nové heslo znovu"), "new-password-456")
    await user.click(screen.getByRole("button", { name: "Změnit heslo" }))
    expect(mutations.password).toHaveBeenCalledWith({
      currentPassword: "old-password-123",
      newPassword: "new-password-456",
    })
    expect(screen.getByLabelText("Současné heslo")).toHaveValue("")
  })
  it("only requests email verification and explains that the old address stays valid", async () => {
    const user = userEvent.setup()
    render(<ChangeEmailForm />)
    expect(
      screen.getByText("Nová adresa začne platit až po ověření odkazem v e-mailu."),
    ).toBeInTheDocument()
    await user.type(screen.getByLabelText("Nový e-mail"), "new@example.com")
    await user.click(screen.getByRole("button", { name: "Ověřit nový e-mail" }))
    expect(mutations.email).toHaveBeenCalledWith("new@example.com")
  })
  it.each([
    ["INVALID_PASSWORD", "Současné heslo"],
    ["WEAK_PASSWORD", "Nové heslo"],
    ["PASSWORD_COMPROMISED", "Nové heslo"],
  ])("shows %s from BetterAuth at the field it is about", async (code, label) => {
    const message = authErrorMessage({ code }, "fallback")
    mutations.password.mockRejectedValue(new AuthRequestError(message, code))
    const user = userEvent.setup()
    render(<ChangePasswordForm profile={profile} />)
    await user.type(screen.getByLabelText("Současné heslo"), "old-password-123")
    await user.type(screen.getByLabelText("Nové heslo", { exact: true }), "new-password-456")
    await user.type(screen.getByLabelText("Nové heslo znovu"), "new-password-456")
    await user.click(screen.getByRole("button", { name: "Změnit heslo" }))
    const field = screen.getByLabelText(label, { exact: true })
    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(field).toHaveAttribute("aria-invalid", "true")
    expect(field.getAttribute("aria-describedby")).toContain(
      screen.getByText(message).getAttribute("id"),
    )
  })
})
