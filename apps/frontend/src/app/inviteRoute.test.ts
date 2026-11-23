import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"

import type * as ApiClient from "@/lib/api-client"
import { authKeys } from "@/lib/auth-keys"
import { Route } from "@/routes/pozvanka.$code"

import type { Session } from "@/features/auth/api/authSessionQueryOptions"
import { inviteKeys } from "@/features/invites/api/invitesQueryOptions"
import { pendingInvite } from "@/features/invites/lib/invite"

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  api: { get: vi.fn() },
}))

const CODE = "q3Zr1hXkE0bLw9yT2vNcAa"
const user = (changes: Partial<NonNullable<Session>["user"]> = {}): Session => ({
  user: {
    id: "me",
    email: "me@example.test",
    name: "Já",
    username: "",
    emailVerified: true,
    ageConfirmedAt: "2026-11-01",
    onboardingCompletedAt: "2026-11-01",
    ...changes,
  },
})

/** Where the invite link sends one, as the redirect `beforeLoad` throws. */
const leadsTo = async (
  code: string,
  session: Session,
  inviter?: { id: string; name: string; interests: string[] } | null,
) => {
  const queryClient = new QueryClient()
  queryClient.setQueryData(authKeys.session(), session)
  if (inviter !== undefined) queryClient.setQueryData(inviteKeys.inviter(code), inviter)
  const beforeLoad = Route.options.beforeLoad as unknown as (args: unknown) => Promise<void>
  try {
    await beforeLoad({
      context: { queryClient },
      params: { code },
      location: { state: { emailVerification: { error: "TOKEN_EXPIRED" } } },
    })
  } catch (thrown) {
    return (thrown as { options: Record<string, unknown> }).options
  }
  throw new Error("no redirect")
}

describe("the invite link /pozvanka/:code (#406)", () => {
  afterEach(() => localStorage.clear())

  it("signed out: remembers the code and leads to the sign-up, the link in `from`", async () => {
    await expect(leadsTo(CODE, null)).resolves.toMatchObject({
      to: "/signup",
      search: { from: `/pozvanka/${CODE}` },
      // an expired verification link's dialog goes along (#155)
      state: { emailVerification: { error: "TOKEN_EXPIRED" } },
    })
    expect(pendingInvite(undefined)).toBe(CODE)
  })

  it("signed out with a malformed code: the sign-up without it", async () => {
    await expect(leadsTo("nope", null)).resolves.toMatchObject({
      to: "/signup",
      search: { from: undefined },
    })
  })

  it("a new account in the onboarding: the onboarding, the link in `from`", async () => {
    await expect(leadsTo(CODE, user({ onboardingCompletedAt: null }))).resolves.toMatchObject({
      to: "/vitej",
      search: { from: `/pozvanka/${CODE}` },
    })
  })

  it("signed in: the inviter's profile", async () => {
    await expect(
      leadsTo(CODE, user(), { id: "u1", name: "Tomáš", interests: [] }),
    ).resolves.toMatchObject({ to: "/uzivatele/$userId", params: { userId: "u1" } })
  })

  it("signed in: the code is not remembered (a shared computer)", async () => {
    await leadsTo(CODE, user(), { id: "u1", name: "Tomáš", interests: [] })
    await leadsTo(CODE, user({ onboardingCompletedAt: null }))
    expect(pendingInvite(undefined)).toBeNull()
  })

  it("one's own link: Můj profil", async () => {
    await expect(
      leadsTo(CODE, user(), { id: "me", name: "Já", interests: [] }),
    ).resolves.toMatchObject({ to: "/profil" })
  })

  it("an invalid code signed in: on to the events", async () => {
    await expect(leadsTo(CODE, user(), null)).resolves.toMatchObject({ to: "/akce" })
  })
})
