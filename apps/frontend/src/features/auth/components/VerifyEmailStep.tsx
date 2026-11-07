import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

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
  /** The e-mail turned out to be verified already: back to signing in. */
  onAlreadyVerified: () => void
}

/**
 * „Ověř si e-mail“ (Figma B-01a, #236): after the sign-up, and when the
 * sign-in is refused because the e-mail isn't verified. Only a verified
 * e-mail signs in, so the next step is the link, then signing in. The
 * password was just typed and stays in memory: where e-mails are simulated
 * (#58) it opens the inbox, which has no session to go by, on a click only.
 */
export function VerifyEmailStep({
  email,
  password,
  from,
  onAlreadyVerified,
}: VerifyEmailStepProps) {
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
        si pošli odkaz znovu.
      </p>
      <div className="flex flex-wrap gap-2">
        <ResendVerificationButton
          email={email}
          from={from}
          variant="outline"
          size="lg"
          onDone={(result) => {
            if (result === "already-verified") onAlreadyVerified()
          }}
        />
        {/* only where e-mails are simulated, the same for every address */}
        {providers.data?.simulatedInbox ? (
          <SimulatedInboxDialog
            email={email}
            // a refusal looks like an empty inbox: it says nothing about the address
            messages={inbox.isError ? [] : inbox.data?.messages}
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
