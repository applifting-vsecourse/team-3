import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { router } from "@/app/router"
import { authKeys } from "@/lib/auth-keys"

import { authClient } from "@/features/auth/lib/auth-client"
import type { PasswordCheck } from "@/features/auth/lib/password"

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: {
    getSession: vi.fn(),
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
    sendVerificationEmail: vi.fn(),
  },
}))
// the strength meter's dictionaries aren't what's tested here
vi.mock("@/features/auth/lib/load-password-checker", () => ({
  loadPasswordChecker: () =>
    Promise.resolve({
      checkPassword: (): PasswordCheck => ({ score: 4, warning: null, suggestions: [] }),
    }),
  preloadPasswordChecker: () => undefined,
}))

const signInEmail = vi.mocked(authClient.signIn.email)
const signUpEmail = vi.mocked(authClient.signUp.email)
const sendVerificationEmail = vi.mocked(authClient.sendVerificationEmail)

const evaUser = { id: "u5", email: "eva.mala@example.com", name: "Eva Malá", emailVerified: true }

/** The app's own routes on `url`, signed out. */
async function renderApp(url: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(authKeys.session(), null)
  vi.mocked(authClient.getSession).mockResolvedValue({ data: null, error: null })
  const app = createRouter({
    ...router.options,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [url] }),
  })
  await app.load()
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={app} />
    </QueryClientProvider>,
  )
  return { app, queryClient }
}

const json = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  )

/**
 * The API: every list is empty, and the simulated inbox (#58) is off (404)
 * unless `inbox` is given: its answer, or a status it refuses with. Returns
 * the requests to the inbox, with their bodies.
 */
const stubApi = ({ inbox }: { inbox?: unknown } = {}) => {
  const inboxRequests: { method: string; body: unknown }[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request) => {
      if (input.url.endsWith("/sign-in-providers")) {
        return json({ google: false, simulatedInbox: inbox !== undefined })
      }
      if (input.url.endsWith("/simulated-inbox")) {
        inboxRequests.push({ method: input.method, body: await input.clone().json() })
        if (typeof inbox === "number") {
          return json(
            { code: "INVALID_EMAIL_OR_PASSWORD", message: "Nesprávný e-mail nebo heslo." },
            inbox,
          )
        }
        return inbox ? json(inbox) : json({ code: "SIMULATED_INBOX_OFF" }, 404)
      }
      return json([])
    }),
  )
  return inboxRequests
}

const signIn = async (email: string, password: string) => {
  await userEvent.type(await screen.findByLabelText("E-mail"), email)
  await userEvent.type(screen.getByLabelText("Heslo"), password)
  await userEvent.click(screen.getByRole("button", { name: "Přihlásit se" }))
}

// #236 (S-5): only a verified e-mail signs in
describe("signing in needs a verified e-mail (#236)", () => {
  beforeEach(() => {
    // the toaster in the root follows the system scheme; jsdom has no matchMedia
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("a verified e-mail signs in and goes on to the page it came from", async () => {
    stubApi()
    signInEmail.mockResolvedValue({ data: {}, error: null })
    const { app } = await renderApp("/login?from=%2Fskupiny")
    // the session the sign-in made
    vi.mocked(authClient.getSession).mockResolvedValue({
      data: { user: evaUser, session: {} },
      error: null,
    })

    await signIn("eva.mala@example.com", "hobbyhub2026")

    await waitFor(() => expect(app.state.location.pathname).toBe("/skupiny"))
    expect(screen.queryByText("Ověř si e-mail")).not.toBeInTheDocument()
  })

  it("an unverified e-mail is refused: „Ověř si e-mail“ with a new link, and back to the form", async () => {
    stubApi()
    signInEmail.mockResolvedValue({
      data: null,
      error: { code: "EMAIL_NOT_VERIFIED", status: 403, message: "Email not verified" },
    })
    sendVerificationEmail.mockResolvedValue({ data: { status: true }, error: null })
    const { app } = await renderApp("/login?from=%2Fakce%2Fe1")

    await signIn("eva.mala@example.com", "hobbyhub2026")

    expect(
      await screen.findByRole("heading", { level: 1, name: "Ověř si e-mail" }),
    ).toBeInTheDocument()
    expect(screen.getByText(/eva\.mala@example\.com zatím není ověřený/)).toBeInTheDocument()
    // no error under a form: the next step instead, and still signed out on the sign-in page
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(app.state.location.pathname).toBe("/login")

    // the new link leads back to the event the sign-in was for, not to the sign-in
    await userEvent.click(screen.getByRole("button", { name: "Poslat odkaz znovu" }))
    await waitFor(() => expect(sendVerificationEmail).toHaveBeenCalledOnce())
    const [{ email, callbackURL }] = sendVerificationEmail.mock.lastCall!
    expect(email).toBe("eva.mala@example.com")
    expect(new URL(callbackURL!).searchParams.get("from")).toBe("/akce/e1")

    await userEvent.click(screen.getByRole("button", { name: "Zpět na přihlášení" }))
    expect(screen.getByRole("heading", { level: 1, name: "Přihlášení" })).toBeInTheDocument()
    expect(screen.getByLabelText("E-mail")).toHaveValue("eva.mala@example.com")
  })

  it("where e-mails are simulated, the e-mail opens with the address and password just typed", async () => {
    const inboxRequests = stubApi({
      inbox: {
        messages: [
          {
            id: "m1",
            subject: "Ověř si e-mail v HobbyHubu",
            sentAt: "2026-11-07T10:00:00.000Z",
            html: "<a href='https://api.example/verify'>Ověřit</a>",
          },
        ],
      },
    })
    signInEmail.mockResolvedValue({
      data: null,
      error: { code: "EMAIL_NOT_VERIFIED", status: 403 },
    })
    await renderApp("/login")

    await signIn("eva.mala@example.com", "hobbyhub2026")

    const open = await screen.findByRole("button", { name: "Otevřít e-mail (simulace)" })
    // nothing asked before the click: an early answer would tell addresses apart
    expect(inboxRequests).toHaveLength(0)

    await userEvent.click(open)

    const dialog = await screen.findByRole("dialog", { name: "Simulovaná schránka" })
    expect(await within(dialog).findByText("Ověř si e-mail v HobbyHubu")).toBeInTheDocument()
    const [request] = inboxRequests
    expect(request?.method).toBe("POST")
    expect(request?.body).toEqual({
      email: "eva.mala@example.com",
      password: "hobbyhub2026",
    })
  })

  it("a refused inbox (somebody else's or a verified address) looks like an empty one", async () => {
    stubApi({ inbox: 401 })
    signInEmail.mockResolvedValue({
      data: null,
      error: { code: "EMAIL_NOT_VERIFIED", status: 403 },
    })
    await renderApp("/login")
    await signIn("petra.novakova@example.com", "hadam-heslo-2026")

    await userEvent.click(await screen.findByRole("button", { name: "Otevřít e-mail (simulace)" }))

    const dialog = await screen.findByRole("dialog", { name: "Simulovaná schránka" })
    expect(
      await within(dialog).findByText("Zatím tu nic není – pošli si odkaz znovu."),
    ).toBeInTheDocument()
    expect(within(dialog).queryByText(/Nesprávný/)).not.toBeInTheDocument()
  })

  it("after the sign-up the user isn't signed in and is asked to open the e-mail", async () => {
    stubApi()
    // BetterAuth with requireEmailVerification: no session token
    signUpEmail.mockResolvedValue({ data: { token: null, user: {} }, error: null })
    const { app, queryClient } = await renderApp("/signup?from=%2Fakce%2Fe1")

    await userEvent.type(await screen.findByLabelText("Jméno"), "Jana Malá")
    await userEvent.type(screen.getByLabelText("E-mail"), "jana@example.com")
    await userEvent.type(screen.getByLabelText("Heslo"), "hobbyhub2026")
    await userEvent.type(screen.getByLabelText("Heslo znovu"), "hobbyhub2026")
    await userEvent.click(screen.getByRole("checkbox", { name: /^Souhlasím s podmínkami užívání/ }))
    await userEvent.click(
      screen.getByRole("checkbox", { name: /^Beru na vědomí zpracování osobních údajů/ }),
    )
    await userEvent.click(screen.getByRole("button", { name: "Zaregistrovat se" }))

    expect(
      await screen.findByRole("heading", { level: 1, name: "Ověř si e-mail" }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Odkaz k ověření jsme poslali na jana@example\.com/),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Poslat odkaz znovu" })).toBeInTheDocument()
    // still on the sign-up, signed out; the sign-in keeps where to come back to
    expect(app.state.location.pathname).toBe("/signup")
    expect(queryClient.getQueryData(authKeys.session())).toBeNull()
    expect(screen.getByRole("link", { name: "Zpět na přihlášení" })).toHaveAttribute(
      "href",
      "/login?from=%2Fakce%2Fe1",
    )
  })
})
