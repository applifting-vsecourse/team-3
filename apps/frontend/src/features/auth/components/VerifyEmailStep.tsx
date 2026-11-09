import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { HTTPError } from "@/lib/api-client"

import { signInProvidersQueryOptions } from "@/features/auth/api/signInProviders"
import {
  simulatedInboxQueryOptions,
  type InboxCredentials,
} from "@/features/auth/api/simulatedInbox"
import { ResendVerificationButton } from "@/features/auth/components/ResendVerificationButton"
import { SimulatedInboxDialog } from "@/features/auth/components/SimulatedInboxDialog"

type VerifyEmailStepProps = InboxCredentials & {
  /** The page the sign-in or sign-up was opened for: the new link leads back there. */
  from?: string
}

/**
 * Why the inbox didn't open, in Czech. 401 is the same for a wrong password,
 * somebody else's account and a verified e-mail (it doesn't tell which
 * addresses have an account), so it says what to do in either case; 429 and
 * the rest come with the API's or the client's own Czech message.
 */
export const inboxErrorMessage = (error: Error): string =>
  error instanceof HTTPError && error.response.status === 401
    ? "Schránku se s tímhle e-mailem a heslem otevřít nepodařilo. Jestli už máš e-mail ověřený, rovnou se přihlas."
    : error.message

/**
 * „Ověř si e-mail“ (Figma B-01a, #236): after the sign-up, and when the
 * sign-in is refused because the e-mail isn't verified. Only a verified
 * e-mail signs in, so the next step is the link, then signing in. The
 * password was just typed and stays in memory: where e-mails are simulated
 * (#58) it opens the inbox, which has no session to go by, on a click only.
 */
export function VerifyEmailStep({ email, password, from }: VerifyEmailStepProps) {
  const providers = useQuery(signInProvidersQueryOptions())
  // Asked only once the dialog opens, never right after the sign-up: an
  // answer before any click would tell a new address (its e-mail is there)
  // from somebody else's account (refused), which sign-up keeps quiet about.
  const [isInboxOpened, setIsInboxOpened] = useState(false)
  const inbox = useQuery({
    ...simulatedInboxQueryOptions({ email, password }),
    enabled: isInboxOpened,
  })

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body">
        Otevři odkaz z e-mailu (platí 24 hodin) a pak se přihlas. Nic nepřišlo? Mrkni do spamu, nebo
        si pošli odkaz znovu. Už máš e-mail ověřený? Rovnou se přihlas.
      </p>
      <div className="flex flex-wrap gap-2">
        <ResendVerificationButton
          email={email}
          from={from}
          variant="outline"
          size="lg"
        />
        {/* only where e-mails are simulated, the same for every address */}
        {providers.data?.simulatedInbox ? (
          <SimulatedInboxDialog
            email={email}
            messages={inbox.data?.messages}
            errorMessage={inbox.error ? inboxErrorMessage(inbox.error) : undefined}
            onOpen={() => {
              if (isInboxOpened) void inbox.refetch()
              else setIsInboxOpened(true)
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
