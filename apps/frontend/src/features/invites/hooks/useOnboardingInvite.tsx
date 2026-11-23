import { useRef, useState, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { inviterQueryOptions } from "@/features/invites/api/invitesQueryOptions"
import type { Inviter } from "@/features/invites/api/invitesSchemas"
import { OnboardingInviteStep } from "@/features/invites/components/OnboardingInviteStep"
import { useInviteAnswer } from "@/features/invites/hooks/useInviteMutations"
import { answerInvite, pendingInvite } from "@/features/invites/lib/invite"

type Offer = { code: string; inviter: Inviter }

/**
 * The invite step of the onboarding (#406): `offer()` before the wizard moves on resolves at
 * once without a valid invite (none, invalid, one's own, already answered), else once
 * „{jméno} tě sem zve“ is answered. `step` is the dialog to render meanwhile.
 */
export function useOnboardingInvite(viewerId: string, from: string | undefined) {
  const queryClient = useQueryClient()
  const [offered, setOffered] = useState<Offer | null>(null)
  const done = useRef<() => void>(() => undefined)

  const offer = async (): Promise<void> => {
    const code = pendingInvite(from)
    if (!code) return
    // undefined: the lookup failed (offline) — skip it now, but keep the invite for later
    const inviter = await queryClient.fetchQuery(inviterQueryOptions(code)).catch(() => undefined)
    if (inviter === undefined) return
    // no such invite (404) or one's own: nothing to ask, ever
    if (!inviter || inviter.id === viewerId) {
      answerInvite(code)
      return
    }
    await new Promise<void>((resolve) => {
      done.current = resolve
      setOffered({ code, inviter })
    })
  }

  const finish = (code: string) => {
    answerInvite(code)
    setOffered(null)
    done.current()
  }

  const step: ReactNode = offered ? (
    <InviteStep
      key={offered.code}
      offer={offered}
      onDone={() => finish(offered.code)}
    />
  ) : null

  return { offer, step }
}

function InviteStep({ offer, onDone }: { offer: Offer; onDone: () => void }) {
  const answer = useInviteAnswer(offer.code)
  return (
    <OnboardingInviteStep
      inviter={offer.inviter}
      isSaving={answer.isPending}
      error={answer.isError ? answer.error.message : undefined}
      onAccept={() =>
        answer.mutate(true, {
          onSuccess: (state) => {
            toast.success(
              state === "friends"
                ? `${offer.inviter.name} je teď mezi přáteli.`
                : "Žádost odeslána.",
            )
            onDone()
          },
        })
      }
      onDecline={() => {
        // the inviter only hears who joined; the onboarding doesn't wait for it
        answer.mutate(false)
        onDone()
      }}
    />
  )
}
