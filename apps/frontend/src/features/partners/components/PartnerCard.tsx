import { Link } from "@tanstack/react-router"
import { Check } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { activityPhoto } from "@/assets/activity-photos"
import { PersonAvatar } from "@/components/PersonAvatar/PersonAvatar"
import { cn } from "@/lib/utils"

import type { Partner } from "@/features/partners/api/partnersSchemas"
import { CHIPS_SHOWN, distanceLabel } from "@/features/partners/lib/partnerDeck"

/**
 * One person in the deck (#84, brief › Obsah karty): a card in a list, so a border and no
 * shadow at rest. The photo is the activity of the first interest in common — the onboarding's
 * photo cards — never the person's own (the public profile shows none). On it the name, which
 * leads to their public profile, and the distance band; under it what we both like.
 */
export function PartnerCard({
  partner,
  nameId,
  isInteractive = true,
}: {
  partner: Partner
  nameId?: string
  /** The cards under the top one are only a picture of the deck: no link to reach. */
  isInteractive?: boolean
}) {
  const photo = activityPhoto(partner.sharedInterests[0]?.slug ?? "")
  const chips = [
    ...partner.sharedInterests.map((activity) => ({ ...activity, isShared: true })),
    ...partner.otherInterests.map((activity) => ({ ...activity, isShared: false })),
  ]
  const shown = chips.slice(0, CHIPS_SHOWN)
  const hidden = chips.length - shown.length
  return (
    <article
      aria-labelledby={nameId}
      className="flex flex-col overflow-hidden rounded-2xl border border-card-border bg-card"
    >
      <div className="relative isolate flex aspect-[4/3] flex-col justify-end gap-1 bg-hero p-5 text-on-hero">
        {photo ? (
          <img
            src={photo.src}
            alt=""
            draggable={false}
            decoding="async"
            className="pointer-events-none absolute inset-0 -z-10 size-full object-cover select-none"
          />
        ) : null}
        <span
          aria-hidden
          className="absolute inset-0 -z-10 bg-linear-to-t from-foreground via-foreground/40 to-foreground/10"
        />
        <PersonAvatar
          name={partner.name}
          className="absolute right-5 bottom-5 size-12"
        />
        {partner.hasRequestedMe ? (
          <span className="w-fit rounded-full border border-control-border bg-badge-neutral px-2 py-0.5 text-xs font-semibold text-badge-neutral-foreground">
            Posílá ti žádost
          </span>
        ) : null}
        <h3
          id={nameId}
          className="min-w-0 pr-16 type-feature break-words"
        >
          {isInteractive ? (
            <Link
              to={ROUTES.userProfile}
              params={{ userId: partner.id }}
              draggable={false}
              className="rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-on-hero focus-visible:outline-none"
            >
              {partner.name}
            </Link>
          ) : (
            partner.name
          )}
        </h3>
        <p className="text-sm text-on-hero-muted">{distanceLabel(partner.distanceBandKm)}</p>
      </div>
      <div className="flex flex-col gap-3 p-5">
        <p className="text-caption font-semibold">Oba vás baví</p>
        <ul
          aria-label="Zájmy"
          className="flex flex-wrap gap-2"
        >
          {shown.map((chip) => (
            <li
              key={chip.id}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs",
                chip.isShared
                  ? "border border-tile-border bg-secondary font-semibold text-secondary-foreground"
                  : "border border-input text-muted-foreground",
              )}
            >
              {chip.isShared ? (
                <Check
                  aria-hidden
                  className="size-3.5"
                />
              ) : null}
              {chip.name}
              {chip.isShared ? <span className="sr-only"> (oba)</span> : null}
            </li>
          ))}
          {hidden > 0 ? (
            <li className="inline-flex items-center rounded-full border border-input px-3 py-1 text-xs text-muted-foreground">
              <span aria-hidden>+{hidden}</span>
              <span className="sr-only">a další {hidden}</span>
            </li>
          ) : null}
        </ul>
      </div>
    </article>
  )
}
