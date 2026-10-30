import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { SignUpForm } from "@/features/auth/components/SignUpForm"
import type { PasswordCheck } from "@/features/auth/lib/password"

// The strength estimator stands in for the real one (its own tests use the
// dictionaries): here it is about what the form shows, and when.
const estimator = vi.hoisted(() => ({
  checkPassword: vi.fn<(password: string, userInputs: string[]) => PasswordCheck>(),
  load: vi.fn<() => void>(),
}))
vi.mock("@/features/auth/lib/load-password-checker", () => ({
  loadPasswordChecker: () => {
    estimator.load()
    return Promise.resolve({ checkPassword: estimator.checkPassword })
  },
  preloadPasswordChecker: () => estimator.load(),
}))

beforeEach(() => {
  estimator.checkPassword.mockReset()
  estimator.checkPassword.mockReturnValue({ score: 4, warning: null, suggestions: [] })
  estimator.load.mockClear()
})

// the consents' labels carry a link (#153), which needs a router
const renderForm = async () => {
  const onSubmit = vi.fn()
  await renderWithRouter(
    <SignUpForm
      isLoading={false}
      onSubmit={onSubmit}
    />,
  )
  return { onSubmit }
}

const terms = () => screen.getByRole("checkbox", { name: /^Souhlasím s podmínkami užívání/ })
const privacy = () =>
  screen.getByRole("checkbox", { name: /^Beru na vědomí zpracování osobních údajů/ })
const submit = () => userEvent.click(screen.getByRole("button", { name: "Zaregistrovat se" }))

type Filled = { name?: string; password?: string; repeated?: string; hasConsents?: boolean }

const fill = async ({
  name = "Jana Malá",
  password = "hobbyhub2026",
  repeated = password,
  hasConsents = true,
}: Filled = {}) => {
  await userEvent.type(screen.getByLabelText("Jméno"), name)
  await userEvent.type(screen.getByLabelText("E-mail"), "jana@example.com")
  await userEvent.type(screen.getByLabelText("Heslo"), password)
  await userEvent.type(screen.getByLabelText("Heslo znovu"), repeated)
  if (hasConsents) {
    await userEvent.click(terms())
    await userEvent.click(privacy())
  }
}

describe("SignUpForm (B-010, #153)", () => {
  it("asks for the name, the e-mail, the password twice and both consents", async () => {
    await renderForm()

    expect(screen.getAllByRole("textbox").map((input) => input.getAttribute("name"))).toEqual([
      "name",
      "email",
    ])
    expect(screen.getByLabelText("Heslo")).toHaveAttribute("type", "password")
    expect(screen.getByLabelText("Heslo znovu")).toHaveAttribute("type", "password")
    expect(terms()).not.toBeChecked()
    expect(privacy()).not.toBeChecked()
    // a screen reader says both are required
    expect(terms()).toBeRequired()
    expect(privacy()).toBeRequired()
  })

  it("links the consents to their pages, opening in a new tab", async () => {
    await renderForm()

    const termsLink = screen.getByRole("link", { name: /^podmínkami užívání/ })
    expect(termsLink).toHaveAttribute("href", "/podminky")
    expect(termsLink).toHaveAttribute("target", "_blank")
    expect(screen.getByRole("link", { name: /^zpracování osobních údajů/ })).toHaveAttribute(
      "href",
      "/ochrana-osobnich-udaju",
    )
  })

  it("clicking a consent's link doesn't tick it", async () => {
    await renderForm()

    // a plain click, as a browser sends it: user-event clicks a label's
    // control from anything inside the label, a link included
    fireEvent.click(screen.getByRole("link", { name: /^podmínkami užívání/ }))

    expect(terms()).not.toBeChecked()
  })

  it("a weak password is refused before sending, saying the rule", async () => {
    const { onSubmit } = await renderForm()

    await fill({ password: "heslo-bez-cisla" })
    await submit()

    expect(
      await screen.findByText("Heslo musí mít aspoň 10 znaků a obsahovat písmeno i číslici."),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("passwords that differ are refused: „Hesla se neshodují“", async () => {
    const { onSubmit } = await renderForm()

    // the consents are missing too: the mismatch shows all the same
    await fill({ repeated: "hobbyhub2027", hasConsents: false })
    await submit()

    expect(await screen.findByText("Hesla se neshodují")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("„Hesla se neshodují“ goes away once the first password is changed to match", async () => {
    await renderForm()

    await fill({ password: "hobbyhub2026", repeated: "hobbyhub2027" })
    await submit()
    expect(await screen.findByText("Hesla se neshodují")).toBeInTheDocument()

    const password = screen.getByLabelText("Heslo")
    await userEvent.clear(password)
    await userEvent.type(password, "hobbyhub2027")

    expect(screen.queryByText("Hesla se neshodují")).not.toBeInTheDocument()
  })

  it("doesn't send without both consents, saying what's missing", async () => {
    const { onSubmit } = await renderForm()

    await fill({ hasConsents: false })
    await userEvent.click(terms())
    await submit()

    expect(
      await screen.findByText("Potvrď, že bereš na vědomí zpracování osobních údajů"),
    ).toBeInTheDocument()
    expect(
      screen.queryByText("Bez souhlasu s podmínkami užívání se zaregistrovat nejde"),
    ).not.toBeInTheDocument()
    expect(privacy()).toHaveAttribute("aria-invalid", "true")
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("a name with characters that don't belong in it is refused, saying which", async () => {
    const { onSubmit } = await renderForm()

    await fill({ name: "Jana <3" })
    await submit()

    expect(
      await screen.findByText(
        "Znak „<“ do jména nepatří. Jméno může obsahovat jen písmena, mezery, pomlčky, apostrofy a tečky.",
      ),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  describe("password strength (#153)", () => {
    it("says what the password lacks for the rule after a pause in typing, in words a screen reader hears", async () => {
      await renderForm()
      const status = screen.getByRole("status")
      expect(status).toHaveAttribute("aria-live", "polite")
      expect(status).toBeEmptyDOMElement()

      await userEvent.type(screen.getByLabelText("Heslo"), "heslo")
      // not at every key: a screen reader would hear each one
      expect(status).toBeEmptyDOMElement()

      await waitFor(() =>
        expect(status).toHaveTextContent("Síla hesla: slabé. Ještě 5 znaků. Přidej číslici."),
      )
      // the rule is checked without the estimator
      expect(estimator.checkPassword).not.toHaveBeenCalled()
    })

    it("once the rule is met, the level is the estimator's, with advice while it isn't strong", async () => {
      await renderForm()
      const status = screen.getByRole("status")
      const password = screen.getByLabelText("Heslo")

      estimator.checkPassword.mockReturnValue({
        score: 1,
        warning: "Tohle je běžné heslo.",
        suggestions: ["Přidej další, méně běžné slovo.", "Vynech řady jako „abc“ nebo „123“."],
      })
      await userEvent.type(password, "heslo12345")
      await waitFor(() =>
        expect(status).toHaveTextContent(
          "Síla hesla: slabé. Tohle je běžné heslo. Přidej další, méně běžné slovo.",
        ),
      )

      estimator.checkPassword.mockReturnValue({ score: 3, warning: null, suggestions: [] })
      await userEvent.type(password, "kolo")
      await waitFor(() =>
        expect(status).toHaveTextContent("Síla hesla: dobré. Silnější bude s dalším slovem."),
      )

      estimator.checkPassword.mockReturnValue({ score: 4, warning: null, suggestions: [] })
      await userEvent.type(password, " jede po silnici")
      await waitFor(() => expect(status).toHaveTextContent(/^Síla hesla: silné\.$/))
    })

    it("knows the name and the e-mail, so a password made of them is weak", async () => {
      await renderForm()

      await userEvent.type(screen.getByLabelText("Jméno"), "Jana Nováková")
      await userEvent.type(screen.getByLabelText("E-mail"), "jana.novakova@example.com")
      await userEvent.type(screen.getByLabelText("Heslo"), "novakova2026")

      await waitFor(() =>
        expect(estimator.checkPassword).toHaveBeenCalledWith(
          "novakova2026",
          expect.arrayContaining(["jana", "nováková", "novakova", "jana.novakova", "hobbyhub"]),
        ),
      )
    })

    it("starts loading the estimator when the field gets focus", async () => {
      await renderForm()
      expect(estimator.load).not.toHaveBeenCalled()

      await userEvent.click(screen.getByLabelText("Heslo"))

      expect(estimator.load).toHaveBeenCalled()
    })

    it("goes away at once when the password is deleted", async () => {
      await renderForm()
      const status = screen.getByRole("status")
      const password = screen.getByLabelText("Heslo")

      await userEvent.type(password, "heslo")
      await waitFor(() => expect(status).toHaveTextContent("Síla hesla: slabé."))

      await userEvent.clear(password)
      expect(status).toBeEmptyDOMElement()
      // and doesn't come back with the next password's first character
      await userEvent.type(password, "x")
      expect(status).toBeEmptyDOMElement()
    })
  })

  it("sends the name, the e-mail, the password and the consents, not the repeated password", async () => {
    const { onSubmit } = await renderForm()

    await fill()
    await submit()

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Jana Malá",
      email: "jana@example.com",
      password: "hobbyhub2026",
      termsAccepted: true,
      privacyAcknowledged: true,
    })
  })

  // as tall as the event form's (44 px, a comfortable tap), not the kit's 36/40 px
  it("has fields and a button the size of the event form's", async () => {
    await renderForm()

    for (const label of ["Jméno", "E-mail", "Heslo", "Heslo znovu"]) {
      expect(screen.getByLabelText(label)).toHaveClass("h-11")
    }
    expect(screen.getByRole("button", { name: "Zaregistrovat se" })).toHaveClass("h-11")
  })
})
