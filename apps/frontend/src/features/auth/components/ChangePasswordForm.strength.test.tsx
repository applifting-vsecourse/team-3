import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { PasswordCheck } from "@/features/auth/lib/password"

import { ChangePasswordForm } from "./AccountForms"

// The real PasswordStrength (AccountForms.test.tsx leaves it out): the
// estimator stands in for the real one and the mutation for the API.
const mutation = vi.hoisted(() => ({ mutateAsync: vi.fn() }))
vi.mock("@/features/auth/hooks/useAccountMutations", () => ({
  useChangePassword: () => ({
    mutateAsync: mutation.mutateAsync,
    isPending: false,
    isSuccess: false,
    error: null,
  }),
}))
vi.mock("@/features/auth/lib/load-password-checker", () => ({
  loadPasswordChecker: () =>
    Promise.resolve({
      checkPassword: (): PasswordCheck => ({ score: 4, warning: null, suggestions: [] }),
    }),
  preloadPasswordChecker: () => undefined,
}))

const profile = { name: "Jana Nová", email: "jana@example.com", hasPassword: true }
const area = () => document.querySelector('[data-slot="password-strength"]')

const fill = async (repeated = "nove-heslo-2026") => {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText("Současné heslo"), "stare-heslo-2026")
  await user.type(screen.getByLabelText("Nové heslo", { exact: true }), "nove-heslo-2026")
  await user.type(screen.getByLabelText("Nové heslo znovu"), repeated)
  await user.click(screen.getByRole("button", { name: "Změnit heslo" }))
}

beforeEach(() => {
  mutation.mutateAsync.mockReset()
})

describe("the password strength in the password change (#199)", () => {
  it("goes away with the emptied field after a successful change", async () => {
    mutation.mutateAsync.mockResolvedValue(undefined)
    render(<ChangePasswordForm profile={profile} />)

    await fill()

    expect(mutation.mutateAsync).toHaveBeenCalled()
    expect(screen.getByLabelText("Nové heslo", { exact: true })).toHaveValue("")
    // no grey bar under the empty field: taken no room until the next password
    expect(area()).toHaveClass("sr-only")
    expect(document.querySelector('[data-slot="password-strength-bar"]')).toBeNull()

    // and it comes back with the next password's first character
    await userEvent.type(screen.getByLabelText("Nové heslo", { exact: true }), "n")
    expect(area()).not.toHaveClass("sr-only")
  })

  it("stays while the password is still there, when the change fails", async () => {
    mutation.mutateAsync.mockRejectedValue(new Error("Něco se pokazilo."))
    render(<ChangePasswordForm profile={profile} />)

    await fill()

    expect(screen.getByLabelText("Nové heslo", { exact: true })).toHaveValue("nove-heslo-2026")
    expect(area()).not.toHaveClass("sr-only")
  })
})
