import { ArrowUpRight, Plus, X } from "lucide-react"

import { activityPhoto } from "@/assets/activity-photos"
import { Button } from "@/components/ui/button"
import type { Activity } from "@/lib/catalog/catalogSchemas"

import { INTEREST_GOAL } from "@/features/onboarding/lib/onboardingFlow"

export function InterestTray({
  interests,
  isDisabled,
  onRemove,
  onReview,
}: {
  interests: Activity[]
  isDisabled?: boolean
  onRemove: (id: string) => void
  onReview: () => void
}) {
  return (
    <div className="relative mx-auto grid w-full max-w-6xl gap-2 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
      <div className="grid min-w-0 gap-2 rounded-2xl border border-hero-pattern bg-hero px-3 py-2 text-on-hero shadow-lg sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4 sm:px-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="shrink-0">
            <p className="text-sm font-semibold">Tvůj výběr</p>
            <span
              aria-live="polite"
              aria-atomic
              className="block text-xs text-on-hero-muted"
            >
              Vybráno {interests.length} ze {INTEREST_GOAL}
            </span>
          </div>
          <ul
            aria-label="Vybrané aktivity"
            className="flex min-w-0 items-center gap-1.5"
          >
            {Array.from({ length: INTEREST_GOAL }, (_, index) => {
              const interest = interests[index]
              const photo = interest && activityPhoto(interest.slug)
              return (
                <li
                  key={index}
                  data-interest-slot={index}
                  className="relative grid size-11 shrink-0 place-items-center rounded-lg border border-dashed border-on-hero/60 sm:size-12"
                >
                  {interest ? (
                    <button
                      type="button"
                      aria-label={`Odebrat ${interest.name}`}
                      title={`Odebrat ${interest.name}`}
                      onClick={() => onRemove(interest.id)}
                      disabled={isDisabled}
                      className="group relative grid size-full place-items-center overflow-hidden rounded-md bg-hero-pattern outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {photo ? (
                        <img
                          src={photo.src}
                          alt=""
                          className="hh-wizard-photo size-full object-cover"
                        />
                      ) : null}
                      <span className="absolute right-0 bottom-0 grid size-5 place-items-center rounded-tl-md bg-hero text-on-hero group-hover:bg-primary group-hover:text-primary-foreground">
                        <X
                          aria-hidden
                          className="size-3.5"
                        />
                      </span>
                    </button>
                  ) : (
                    <Plus
                      aria-hidden
                      className="size-4 text-on-hero-muted"
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </div>
        {interests.length > 0 ? (
          <Button
            type="button"
            className="min-h-11 rounded-xl"
            onClick={onReview}
            disabled={isDisabled}
          >
            Pokračovat s výběrem <ArrowUpRight aria-hidden />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
