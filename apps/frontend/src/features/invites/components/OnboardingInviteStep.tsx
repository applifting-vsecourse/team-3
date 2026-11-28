import { useRef } from "react"
import { UserPlus } from "lucide-react"

import { PersonAvatar } from "@/components/PersonAvatar/PersonAvatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

import type { Inviter } from "@/features/invites/api/invitesSchemas"

type OnboardingInviteStepProps = {
  inviter: Inviter
  isSaving: boolean
  error?: string
  onAccept: () => void
  onDecline: () => void
}

/**
 * „{jméno} tě sem zve“ (#406, brief §4): after the onboarding is saved, only with a valid
 * invite, in the window of „Máš vybráno!“ (the band on top, the card below). „Přidat do
 * přátel“ is the default; „Teď ne“ (or Escape) goes on without it.
 */
export function OnboardingInviteStep({
  inviter,
  isSaving,
  error,
  onAccept,
  onDecline,
}: OnboardingInviteStepProps) {
  const title = useRef<HTMLHeadingElement>(null)
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !isSaving) onDecline()
      }}
    >
      <DialogContent
        showCloseButton={false}
        // over „Máš vybráno!“ (raised already): a second raised overlay would turn the page black
        overlayClassName="hh-wizard-overlay"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          title.current?.focus({ preventScroll: true })
        }}
        onEscapeKeyDown={(event) => {
          if (isSaving) event.preventDefault()
        }}
        onPointerDownOutside={(event) => event.preventDefault()}
        className="max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-xl gap-0 overflow-y-auto rounded-2xl border-card-border p-0 motion-reduce:animate-none"
      >
        <div className="space-y-4 bg-hero p-5 text-on-hero sm:p-6">
          <PersonAvatar
            name={inviter.name}
            className="size-12"
          />
          <DialogTitle
            asChild
            className="type-title break-words focus:outline-none"
          >
            <h2
              ref={title}
              tabIndex={-1}
            >
              {inviter.name} tě sem zve
            </h2>
          </DialogTitle>
          <DialogDescription className="text-on-hero-muted">
            Přidej se k přátelům a uvidíte navzájem, kam chodíte.
          </DialogDescription>
        </div>
        <div className="space-y-4 bg-card p-5 sm:p-6">
          {error ? (
            <p
              role="alert"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            className="min-h-11 whitespace-normal"
            disabled={isSaving}
            onClick={onAccept}
          >
            <UserPlus aria-hidden /> {isSaving ? "Přidávám…" : "Přidat do přátel"}
          </Button>
          <Button
            type="button"
            variant="link"
            className="min-h-11 px-0"
            disabled={isSaving}
            onClick={onDecline}
          >
            Teď ne
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
