import { MapPin } from "lucide-react"

import { activityPhoto } from "@/assets/activity-photos"
import { LogoMark } from "@/components/Logo/Logo"
import type { Activity, ActivityCategory, Locality } from "@/lib/catalog/catalogSchemas"

import welcomePhoto from "@/features/onboarding/assets/letna.webp"
import { coverForCategory } from "@/features/onboarding/lib/activityScenes"

function sceneSources(category: ActivityCategory | undefined, interests: Activity[]) {
  const picked = interests.map(({ slug }) => activityPhoto(slug)?.src)
  const cover = category ? activityPhoto(coverForCategory(category))?.src : undefined
  const defaults = [
    activityPhoto("turistika")?.src,
    cover ?? welcomePhoto,
    activityPhoto("deskove-hry")?.src,
  ]
  return [...picked, ...defaults.filter((src) => !picked.includes(src))].slice(0, 3)
}

export function OnboardingArtwork({
  category,
  interests,
  locality,
  isMinor = false,
}: {
  category?: ActivityCategory
  interests: Activity[]
  locality: Locality | null
  isMinor?: boolean
}) {
  const [left, center, right] = sceneSources(category, interests)
  return (
    <div
      className={
        isMinor
          ? "mt-3 md:hidden"
          : "hidden min-h-0 md:flex md:flex-1 md:flex-col md:justify-center md:gap-5 md:px-4"
      }
    >
      <div
        aria-hidden
        className="relative isolate mx-auto aspect-[2/1] w-full max-w-sm overflow-hidden rounded-2xl bg-hero-pattern/55 md:aspect-[4/5]"
      >
        <div className="absolute inset-[12%] rounded-full border border-primary/25" />
        <div className="absolute inset-[22%] rounded-full border border-primary/15" />
        {left ? (
          <div className="absolute top-[22%] left-[9%] h-[63%] w-[35%] -rotate-9 overflow-hidden rounded-lg border-2 border-on-hero/60 md:top-[23%] md:left-[6%] md:h-[52%] md:w-[43%]">
            <img
              key={left}
              src={left}
              alt=""
              className="hh-wizard-photo size-full object-cover"
            />
          </div>
        ) : null}
        {right ? (
          <div className="absolute top-[21%] right-[8%] h-[63%] w-[35%] rotate-10 overflow-hidden rounded-lg border-2 border-on-hero/60 md:top-[31%] md:right-[6%] md:h-[51%] md:w-[42%]">
            <img
              key={right}
              src={right}
              alt=""
              className="hh-wizard-photo size-full object-cover"
            />
          </div>
        ) : null}
        {center ? (
          <div className="absolute top-[9%] left-[28%] h-[78%] w-[44%] -rotate-2 overflow-hidden rounded-xl border-2 border-on-hero bg-hero md:top-[13%] md:left-[21%] md:h-[70%] md:w-[58%]">
            <img
              key={center}
              src={center}
              decoding="async"
              alt=""
              className="hh-wizard-photo size-full object-cover"
            />
          </div>
        ) : null}
        <LogoMark
          isOnHero
          className="absolute right-[7%] bottom-[8%] size-9 rounded-lg bg-hero p-1.5 md:size-11"
        />
      </div>
      {locality && !isMinor ? (
        <p className="mx-auto flex items-center gap-2 px-1 text-sm text-on-hero">
          <MapPin
            aria-hidden
            className="size-4 text-primary"
          />{" "}
          {locality.name}
        </p>
      ) : null}
    </div>
  )
}
