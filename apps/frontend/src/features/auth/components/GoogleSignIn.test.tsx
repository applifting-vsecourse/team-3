import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api, HTTPError } from "@/lib/api-client"
import type * as ApiClient from "@/lib/api-client"
import { renderWithRouter } from "@/test/renderWithRouter"

import { GoogleSignIn } from "@/features/auth/components/GoogleSignIn"
import { authClient } from "@/features/auth/lib/auth-client"

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: {
    signIn: { social: vi.fn(() => Promise.resolve({ data: { redirect: true }, error: null })) },
  },
}))

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  api: { get: vi.fn() },
}))

const get = vi.mocked(api.get)
const social = vi.mocked(authClient.signIn.social)

/** GET /api/sign-in-providers answers with this. */
const providers = (hasGoogle: boolean) =>
  get.mockReturnValue({ json: () => Promise.resolve({ google: hasGoogle }) } as never)

const renderGoogle = async (from?: string) => {
  const queryClient = new QueryClient()
  const view = await renderWithRouter(
    <QueryClientProvider client={queryClient}>
      <GoogleSignIn from={from} />
    </QueryClientProvider>,
  )
  return { queryClient, ...view }
}

const button = () => screen.findByRole("button", { name: "Pokračovat přes Google" })

beforeEach(() => {
  social.mockClear()
})

describe("GoogleSignIn (#154)", () => {
  it("shows „Pokračovat přes Google“ once the server has Google set up", async () => {
    providers(true)
    await renderGoogle()

    expect(await button()).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith("sign-in-providers")
  })

  it("shows nothing without Google on the server — staging today", async () => {
    providers(false)
    const { queryClient, container } = await renderGoogle()

    await vi.waitFor(() =>
      expect(queryClient.getQueryState(["auth", "sign-in-providers"])?.status).toBe("success"),
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("shows nothing when the server can't be asked, rather than an error", async () => {
    get.mockReturnValue({
      json: () =>
        Promise.reject(
          new HTTPError(
            new Response(null, { status: 404 }),
            new Request("http://localhost:4050/api/sign-in-providers"),
            {} as never,
          ),
        ),
    } as never)
    const { queryClient, container } = await renderGoogle()

    await vi.waitFor(() =>
      expect(queryClient.getQueryState(["auth", "sign-in-providers"])?.status).toBe("error"),
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("goes to Google, back to `from` once signed in and to /login when not", async () => {
    providers(true)
    await renderGoogle(encodeURIComponent("/akce/e1"))

    await userEvent.click(await button())

    const origin = window.location.origin
    expect(social).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: `${origin}/akce/e1`,
      errorCallbackURL: `${origin}/login?from=%252Fakce%252Fe1`,
    })
  })

  it("keeps the user in the app whatever `from` says", async () => {
    providers(true)
    await renderGoogle(encodeURIComponent("https://evil.example"))

    await userEvent.click(await button())

    expect(social).toHaveBeenCalledWith(
      expect.objectContaining({ callbackURL: `${window.location.origin}/akce` }),
    )
  })

  it("says that continuing agrees to the terms, with links to both pages", async () => {
    providers(true)
    await renderGoogle()
    await button()

    expect(
      screen.getByText(/^Pokračováním přes Google souhlasíš s/, { selector: "p" }),
    ).toHaveTextContent("a bereš na vědomí zpracování osobních údajů")
    expect(screen.getByRole("link", { name: /^podmínkami užívání/ })).toHaveAttribute(
      "href",
      "/podminky",
    )
    expect(screen.getByRole("link", { name: /^zpracování osobních údajů/ })).toHaveAttribute(
      "href",
      "/ochrana-osobnich-udaju",
    )
  })

  it("says in Czech when BetterAuth won't start the sign-in", async () => {
    providers(true)
    social.mockResolvedValueOnce({
      data: null,
      error: { status: 500, message: "Internal Server Error" },
    })
    await renderGoogle()

    await userEvent.click(await button())

    expect(
      await screen.findByText("Přihlášení přes Google se nepovedlo. Zkus to prosím znovu."),
    ).toBeInTheDocument()
  })
})
