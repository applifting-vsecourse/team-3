import { useRef } from "react"
import { Link } from "@tanstack/react-router"
import { CalendarSearch } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { LogoMark } from "@/components/Logo/Logo"
import { PersonAvatar } from "@/components/PersonAvatar/PersonAvatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

import "./partners-motion.css"

import type { Partner } from "@/features/partners/api/partnersSchemas"

/**
 * „Je to shoda!“ (#84): „Přidat“ met their request, so the two are friends now. In the style of
 * the onboarding's „Máš vybráno!“: the dark hero on top, the card below. The two avatars meet
 * and the logo's ring fills in — the group was missing one, now it is whole. No confetti; under
 * reduced motion everything is simply in place. The next step leads off the screen, to an event
 * of an activity both like.
 */
export function PartnerMatch({
  partner,
  viewerName,
  onClose,
  onRestoreFocus,
}: {
  partner: Partner
  viewerName: string
  onClose: () => void
  onRestoreFocus: () => void
}) {
  const title = useRef<HTMLHeadingElement>(null)
  const activities = partner.sharedInterests.map(({ slug }) => slug).join(",")
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName="hh-deck-overlay"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onRestoreFocus()
        }}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          title.current?.focus({ preventScroll: true })
        }}
        className="max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-md gap-0 overflow-y-auto rounded-2xl border-card-border p-0 motion-reduce:animate-none"
      >
        <div className="flex flex-col items-center gap-4 bg-hero p-6 text-center text-on-hero">
          <div
            aria-hidden
            className="flex items-center"
          >
            <PersonAvatar
              name={viewerName}
              className="hh-deck-meet-left border-2 border-hero data-[size=lg]:size-16"
            />
            <PersonAvatar
              name={partner.name}
              className="hh-deck-meet-right -ml-4 border-2 border-hero data-[size=lg]:size-16"
            />
          </div>
          <LogoMark
            isOnHero
            isFull
            className="hh-deck-full size-9"
          />
          <DialogTitle
            asChild
            className="type-title focus:outline-none"
          >
            <h2
              ref={title}
              tabIndex={-1}
            >
              Je to shoda!
            </h2>
          </DialogTitle>
          <DialogDescription className="text-on-hero-muted">
            {partner.name} tě chce taky přidat. Teď jste přátelé a uvidíte navzájem, kam chodíte.
          </DialogDescription>
        </div>
        <div className="flex flex-col gap-2 bg-card p-6">
          <Button
            asChild
            className="min-h-11"
          >
            <Link
              to={ROUTES.events}
              // /akce around the remembered locality; its okolí needs a centre the card can't give
              search={{ aktivita: activities || undefined }}
            >
              <CalendarSearch aria-hidden /> Najít společnou akci
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="min-h-11"
          >
            <Link
              to={ROUTES.userProfile}
              params={{ userId: partner.id }}
            >
              Zobrazit profil
            </Link>
          </Button>
          <Button
            type="button"
            variant="link"
            className="min-h-11"
            onClick={onClose}
          >
            Hledat dál
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
