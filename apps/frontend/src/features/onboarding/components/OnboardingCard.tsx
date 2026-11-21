import type { CSSProperties, MouseEvent } from "react"
import { Check, ChevronRight, Plus } from "lucide-react"

import { activityPhoto } from "@/assets/activity-photos"
import { ActivityTile } from "@/components/ActivityTile/ActivityTile"
import { cn } from "@/lib/utils"

type OnboardingCardProps = {
  name: string
  photoSlug: string
  icon: string
  kind: "activity" | "category"
  isSelected: boolean
  isDisabled?: boolean
  isCompact?: boolean
  order: number
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void
  interestId?: string
}

export function OnboardingCard({
  name,
  photoSlug,
  icon,
  kind,
  isSelected,
  isDisabled,
  isCompact = false,
  order,
  onSelect,
  interestId,
}: OnboardingCardProps) {
  const photo = activityPhoto(photoSlug)
  const Mark = isSelected ? Check : kind === "activity" ? Plus : ChevronRight
  const style = { "--card-entrance-delay": `${Math.min(order, 7) * 34}ms` } as CSSProperties

  return (
    <button
      type="button"
      data-interest-id={interestId}
      aria-pressed={isSelected}
      disabled={isDisabled}
      onClick={onSelect}
      style={style}
      className={cn(
        "hh-wizard-card group relative isolate flex min-w-0 items-end overflow-hidden rounded-xl border-2 border-transparent bg-hero text-left text-on-hero outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isCompact
          ? "min-h-12 shrink-0 items-center gap-2 bg-card px-3 text-foreground"
          : "aspect-[5/4] min-h-24 p-3",
        isSelected &&
          (isCompact
            ? "border-primary-edge bg-secondary text-secondary-foreground"
            : "border-primary ring-2 ring-primary-edge"),
      )}
    >
      {photo && !isCompact ? (
        <img
          src={photo.src}
          alt=""
          loading={order < 8 ? "eager" : "lazy"}
          decoding="async"
          className="hh-wizard-card-image pointer-events-none absolute inset-0 -z-10 size-full object-cover"
        />
      ) : null}
      {!isCompact ? (
        <span
          aria-hidden
          className="absolute inset-0 -z-10 bg-linear-to-t from-foreground via-foreground/75 to-foreground/10"
        />
      ) : null}
      {isCompact || kind === "category" || !photo ? (
        <ActivityTile
          icon={icon}
          className={cn(
            "size-6 border-0 bg-transparent text-current",
            !isCompact && "absolute top-2 left-2 size-8 bg-foreground/85",
          )}
          iconClassName="size-5"
        />
      ) : null}
      <span className="relative leading-tight font-semibold wrap-break-word">{name}</span>
      {!isCompact ? (
        <span
          key={isSelected ? "picked" : "free"}
          aria-hidden
          className={cn(
            "absolute top-2 right-2 grid size-8 place-items-center rounded-full border border-on-hero/70 bg-foreground/85 text-on-hero",
            isSelected && "hh-wizard-picked border-primary bg-primary text-primary-foreground",
          )}
        >
          <Mark className="size-4" />
        </span>
      ) : null}
    </button>
  )
}
