import { fireEvent, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { SignUpForm } from "@/features/auth/components/SignUpForm"

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

  it("says how strong the password is while it's typed, in words a screen reader hears", async () => {
    await renderForm()
    const status = screen.getByRole("status")
    expect(status).toHaveAttribute("aria-live", "polite")
    expect(status).toBeEmptyDOMElement()

    const password = screen.getByLabelText("Heslo")
    await userEvent.type(password, "hobbyhub")
    expect(status).toHaveTextContent("Síla hesla: slabé")

    await userEvent.type(password, "26")
    expect(status).toHaveTextContent("Síla hesla: dobré")

    await userEvent.type(password, "-Pankrác")
    expect(status).toHaveTextContent("Síla hesla: silné")
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
