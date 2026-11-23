import { useId, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { Check } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { activityPhoto } from "@/assets/activity-photos"
import { PersonAvatar } from "@/components/PersonAvatar/PersonAvatar"

import type { Partner } from "@/features/partners/api/partnersSchemas"
import { cardPhotoSlug, CHIPS_SHOWN, distanceLabel } from "@/features/partners/lib/partnerDeck"

/**
 * One person in the deck (#84, brief › Obsah karty): a card in a list, so a border and no
 * shadow at rest. The photo is one of the activities in common — the onboarding's photo cards —
 * picked by the person's id, so two volleyball players don't look alike; never the person's own
 * photo (the public profile shows none). On it the name, which
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
  const photo = activityPhoto(cardPhotoSlug(partner))
  // „Oba vás baví“ first, all of them up to five; the quiet rest after, then „+2“
  const shared = partner.sharedInterests.slice(0, CHIPS_SHOWN)
  const others = partner.otherInterests.slice(0, Math.max(0, CHIPS_SHOWN - shared.length))
  const hidden =
    partner.sharedInterests.length + partner.otherInterests.length - shared.length - others.length
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
        <ChipGroup title="Oba vás baví">
          {shared.map((chip) => (
            <li
              key={chip.id}
              className="inline-flex items-center gap-1 rounded-full border border-tile-border bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground"
            >
              <Check
                aria-hidden
                className="size-3.5"
              />
              {chip.name}
            </li>
          ))}
        </ChipGroup>
        {others.length > 0 || hidden > 0 ? (
          <ChipGroup title="Další zájmy">
            {others.map((chip) => (
              <li
                key={chip.id}
                className="inline-flex items-center rounded-full border border-input px-3 py-1 text-xs text-muted-foreground"
              >
                {chip.name}
              </li>
            ))}
            {hidden > 0 ? (
              <li className="inline-flex items-center rounded-full border border-input px-3 py-1 text-xs text-muted-foreground">
                <span aria-hidden>+{hidden}</span>
                <span className="sr-only">a další {hidden}</span>
              </li>
            ) : null}
          </ChipGroup>
        ) : null}
      </div>
    </article>
  )
}

/** One group of chips with its quiet label; the label names the list for a screen reader. */
function ChipGroup({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId()
  return (
    <div className="flex flex-col gap-2">
      <p
        id={titleId}
        className="text-caption font-semibold"
      >
        {title}
      </p>
      <ul
        aria-labelledby={titleId}
        className="flex flex-wrap gap-2"
      >
        {children}
      </ul>
    </div>
  )
}
