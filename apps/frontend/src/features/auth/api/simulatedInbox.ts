import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"
import { authKeys } from "@/lib/auth-keys"

/**
 * POST /api/simulated-inbox (#58, #236): where no e-mail service is set up,
 * the verification e-mails the backend would have sent to an account, newest
 * first. An unverified e-mail can't sign in, so the account's e-mail and
 * password open it instead of a session. 404 once e-mails go out for real
 * (Resend or SMTP is set).
 */
export const simulatedInboxSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      subject: z.string(),
      sentAt: z.coerce.date(),
      html: z.string(),
    }),
  ),
})

export type SimulatedEmail = z.infer<typeof simulatedInboxSchema>["messages"][number]

export const simulatedInboxKeys = {
  all: () => [...authKeys.all(), "simulated-inbox"] as const,
  // per address: after switching accounts, nobody gets the previous one's e-mail from the cache
  of: (email: string) => [...simulatedInboxKeys.all(), email] as const,
}

export type InboxCredentials = { email: string; password: string }

export const simulatedInboxQueryOptions = ({ email, password }: InboxCredentials) =>
  // never the password in the key: the cache and the devtools show keys; one account per e-mail
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  queryOptions({
    queryKey: simulatedInboxKeys.of(email),
    queryFn: async () =>
      simulatedInboxSchema.parse(
        await api.post("simulated-inbox", { json: { email, password } }).json(),
      ),
    // 404 means real e-mails: asking again (or on window focus) won't change it
    retry: false,
    refetchOnWindowFocus: false,
  })
