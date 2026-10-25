import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"
import { authKeys } from "@/lib/auth-keys"

/**
 * GET /api/me/simulated-inbox (#58): where no e-mail service is set up, the
 * verification e-mails the backend would have sent to the signed-in user,
 * newest first. 404 once e-mails go out for real (Resend or SMTP is set).
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

export const simulatedInboxQueryOptions = (email: string) =>
  queryOptions({
    queryKey: simulatedInboxKeys.of(email),
    queryFn: async () => simulatedInboxSchema.parse(await api.get("me/simulated-inbox").json()),
    // 404 means real e-mails: asking again (or on window focus) won't change it
    retry: false,
    refetchOnWindowFocus: false,
  })
