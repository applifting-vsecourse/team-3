import type { Ref } from "react"
import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

import type { PartnerPage, PartnerRadius } from "@/features/partners/api/partnersSchemas"
import { widerRadius } from "@/features/partners/lib/partnersSearch"

/**
 * Nobody left in the radius (#84, brief › Došli lidé): one sentence and the next step — a wider
 * radius while there is one, then the events. Never a blank area (DESIGN.md › three states).
 */
export function PartnersEmpty({
  ref,
  radiusKm,
  onWiden,
}: {
  ref?: Ref<HTMLHeadingElement>
  radiusKm: PartnerRadius
  onWiden: (radius: PartnerRadius) => void
}) {
  const wider = widerRadius(radiusKm)
  return (
    <div className="hh-deck-arrive flex flex-col items-start gap-4 rounded-2xl border border-card-border bg-card p-6">
      <h3
        ref={ref}
        tabIndex={-1}
        className="type-card-heading focus:outline-none"
      >
        {wider
          ? `V okolí ${radiusKm} km teď nikdo další není.`
          : `Do ${radiusKm} km teď nikdo další není.`}
      </h3>
      <p className="text-sm text-muted-foreground">
        {wider
          ? "Zkus hledat dál, nebo si v profilu přidej další zájmy."
          : "Noví lidé přibývají každý den. Další zájmy si můžeš přidat v profilu."}
      </p>
      <div className="flex flex-wrap gap-2">
        {wider ? (
          <Button
            type="button"
            className="min-h-11"
            onClick={() => onWiden(wider)}
          >
            Hledat do {wider} km
          </Button>
        ) : (
          <Button
            asChild
            className="min-h-11"
          >
            <Link to={ROUTES.events}>Prohlédnout akce</Link>
          </Button>
        )}
        <Button
          asChild
          variant="outline"
          className="min-h-11"
        >
          <Link to={ROUTES.editProfile}>Upravit zájmy</Link>
        </Button>
      </div>
    </div>
  )
}

const SETUP_COPY = {
  locality: "Nastav si domovské místo, ať víme, koho ti ukázat.",
  interests: "Vyber si, co tě baví, ať víme, koho ti ukázat.",
} as const

/** Without a home locality or interests there is nobody to suggest yet: the profile first. */
export function PartnersSetup({ missing }: { missing: PartnerPage["missing"] }) {
  return (
    <div className="flex w-full max-w-100 flex-col items-start gap-4 rounded-2xl border border-card-border bg-card p-6">
      <h2 className="type-card-heading">{SETUP_COPY[missing[0] ?? "locality"]}</h2>
      <Button
        asChild
        className="min-h-11"
      >
        <Link to={ROUTES.editProfile}>Nastavit v profilu</Link>
      </Button>
    </div>
  )
}

/** The deck couldn't load: the message and a way to retry, in the card's place. */
export function PartnersError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-card-border bg-card p-6">
      <p
        role="alert"
        className="text-sm"
      >
        Lidi z okolí se nepodařilo načíst. Zkontroluj připojení a zkus to znovu.
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={onRetry}
      >
        Zkusit znovu
      </Button>
    </div>
  )
}
