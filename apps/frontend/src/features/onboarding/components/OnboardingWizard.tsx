import { useEffect, useRef, useState, type ReactNode } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { ArrowLeft, ArrowRight, LoaderCircle, MapPin, Plus, Sparkles, X } from "lucide-react"
import { z } from "zod"

import { activityPhoto } from "@/assets/activity-photos"
import { Logo } from "@/components/Logo/Logo"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api-client"
import { activityTreeQueryOptions, localitiesQueryOptions } from "@/lib/catalog/catalogQueryOptions"
import type { Activity, Locality } from "@/lib/catalog/catalogSchemas"
import { defaultLocalityQueryOptions } from "@/lib/catalog/defaultLocality"
import { cn } from "@/lib/utils"

import welcomePhoto from "@/features/onboarding/assets/letna.webp"

import { CategoryPicker } from "./CategoryPicker"
import { InterestPicker } from "./InterestPicker"
import { LocalityPicker } from "./LocalityPicker"

const MAX_INTERESTS = 3
const resultSchema = z.object({
  onboardingCompletedAt: z.string(),
  localitySlug: z.string().nullable(),
  hasInterests: z.boolean(),
})

type Preferences = {
  homeLocalityId: string
  interestIds: string[]
  bio?: string
}

export type OnboardingResult = z.infer<typeof resultSchema>

type OnboardingWizardProps = {
  viewerId: string
  renderEventPreview?: (locality: Locality, categoryId: string) => ReactNode
  onFinish: (result: OnboardingResult, preferencesSaved: boolean) => Promise<void>
}

export function OnboardingWizard({
  viewerId,
  onFinish,
  renderEventPreview,
}: OnboardingWizardProps) {
  const heading = useRef<HTMLHeadingElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [preferredCategoryIds, setPreferredCategoryIds] = useState<string[]>([])
  const [bio, setBio] = useState("")
  const [chosenLocality, setChosenLocality] = useState<string>()
  const [selected, setSelected] = useState<string[]>([])
  const [message, setMessage] = useState("")
  const [isAddingPlace, setIsAddingPlace] = useState(false)

  const localities = useQuery(localitiesQueryOptions())
  const defaultLocality = useQuery(defaultLocalityQueryOptions(viewerId))
  const activities = useQuery(activityTreeQueryOptions())
  const suggestedId = defaultLocality.data?.locality?.id
  const locality = localities.data?.find(({ id }) => id === (chosenLocality ?? suggestedId))
  const isIpGuess = chosenLocality === undefined && defaultLocality.data?.source === "ip"
  const categories = activities.data ?? []
  const catalog = categories.flatMap((category) => category.activities)
  const pickedActivities = selected.flatMap((id) =>
    catalog.filter((activity) => activity.id === id),
  )
  const isLocalityStep = step === 1
  const isCategoryStep = step === 2
  const isInterestStep = step === 3
  const isProfileStep = step === 4
  const hasEnoughInterests = selected.length === MAX_INTERESTS

  const finish = useMutation({
    mutationFn: async (input: Preferences | null) =>
      resultSchema.parse(
        await (
          input
            ? api.post("me/profile/onboarding", { json: input })
            : api.post("me/profile/onboarding/skip")
        ).json(),
      ),
    onSuccess: (result, input) => onFinish(result, input !== null),
  })

  useEffect(() => {
    if (content.current) content.current.scrollTop = 0
    heading.current?.focus({ preventScroll: true })
  }, [step])

  const toggleInterest = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((item) => item !== id))
    } else if (selected.length < MAX_INTERESTS) {
      setSelected([...selected, id])
    } else {
      setMessage("Máš vybrané 3 aktivity. Před přidáním další jednu odeber.")
      return
    }
    setMessage("")
  }

  const goBack = () => {
    finish.reset()
    setMessage("")
    setStep(step === 4 ? 3 : step === 3 ? 2 : 1)
  }

  const advance = (action: "next" | "profile" | "without-bio" = "next") => {
    if (!locality) {
      setMessage("Vyber místo ze seznamu a pokračuj.")
      return
    }
    if (isLocalityStep) {
      setChosenLocality(locality.id)
      setMessage("")
      setStep(2)
      return
    }
    if (isCategoryStep) {
      setStep(3)
      return
    }
    if (!hasEnoughInterests) {
      const missing = MAX_INTERESTS - selected.length
      setMessage(missing === 1 ? "Vyber ještě 1 aktivitu." : `Vyber ještě ${missing} aktivity.`)
      return
    }
    setMessage("")
    if (action === "profile") {
      setStep(4)
      return
    }
    const about = isProfileStep && action !== "without-bio" ? bio.trim() : ""
    finish.mutate({
      homeLocalityId: locality.id,
      interestIds: selected,
      ...(about && { bio: about }),
    })
  }

  const isWorking = finish.isPending || isAddingPlace
  const header = ["Kde se potkáme?", "Co tě láká?", "Co tě baví?", "Řekni nám něco o sobě"][
    step - 1
  ]
  const description = [
    "Ať ti můžeme ukázat akce kousek od tebe.",
    "Které okruhy tě zajímají? Dáme jim přednost v nabídce aktivit.",
    "Vyber 3 aktivity. Podle nich ti ukážeme akce, kam se můžeš přidat.",
    "Jak nejradši trávíš volno? Co by tě bavilo zkusit? Krátké „O mně“ si můžeš doplnit i později.",
  ][step - 1]
  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          heading.current?.focus({ preventScroll: true })
        }}
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {
          event.preventDefault()
          if (!isLocalityStep && !isWorking) goBack()
        }}
        className="flex h-dvh min-h-0 max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 data-[state=open]:slide-in-from-bottom-4 motion-reduce:animate-none sm:h-[min(790px,calc(100dvh-3rem))] sm:w-[calc(100%-3rem)] sm:max-w-6xl sm:rounded-2xl sm:border sm:border-card-border lg:grid lg:grid-cols-[minmax(260px,1fr)_2.6fr]"
      >
        <aside className="relative isolate shrink-0 overflow-hidden bg-hero text-on-hero lg:flex lg:min-h-0 lg:flex-col lg:justify-between">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:block lg:p-7">
            <Logo isOnHero />
            <div className="flex items-center gap-3 lg:mt-7">
              <div
                aria-hidden
                className="flex gap-1.5"
              >
                {[1, 2, 3].map((segment) => (
                  <span
                    key={segment}
                    className={cn(
                      "h-1 w-4 rounded-full",
                      segment <= step ? "bg-primary" : "bg-on-hero/35",
                    )}
                  />
                ))}
              </div>
              <span className="text-sm text-on-hero-muted">
                {isProfileStep ? "Volitelný profil" : `Krok ${step} ze 3`}
              </span>
            </div>
          </div>
          {isLocalityStep ? (
            <div className="hidden min-h-0 flex-1 flex-col justify-center gap-5 px-6 pb-7 lg:flex">
              <img
                src={welcomePhoto}
                alt=""
                className="aspect-[4/3] w-full rounded-xl object-cover"
              />
              <p className="type-feature text-balance">Dobrá parta může být za rohem.</p>
            </div>
          ) : (
            <div className="hidden flex-1 flex-col gap-4 overflow-auto px-7 pb-7 lg:flex">
              {locality ? (
                <span className="flex items-center gap-2 text-sm font-medium text-on-hero-muted">
                  <MapPin
                    aria-hidden
                    className="size-4 shrink-0"
                  />
                  {locality.name}
                </span>
              ) : null}
              {step >= 3 ? (
                <div className="border-t border-on-hero/25 pt-5">
                  <p className="text-lg font-semibold">Tvůj výběr</p>
                  <p
                    aria-live="polite"
                    className="mt-1 text-sm text-on-hero-muted"
                  >
                    Vybráno {selected.length} ze {MAX_INTERESTS}
                  </p>
                  <ul
                    className="mt-4 space-y-2"
                    aria-label="Vybrané aktivity"
                  >
                    {Array.from({ length: MAX_INTERESTS }, (_, index) => (
                      <ActivitySlot
                        key={index}
                        activity={pickedActivities[index]}
                        isDisabled={isWorking}
                        onRemove={toggleInterest}
                      />
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            ref={content}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-5 pb-6 sm:px-8 sm:pt-6 lg:px-8"
          >
            <div
              key={step}
              className="space-y-5 motion-safe:duration-200 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
            >
              <div className="space-y-2">
                <DialogTitle
                  asChild
                  className="font-heading text-3xl leading-tight font-bold text-balance focus:outline-none sm:text-4xl"
                >
                  <h1
                    ref={heading}
                    tabIndex={-1}
                  >
                    {header}
                  </h1>
                </DialogTitle>
                <DialogDescription className="max-w-lg text-sm text-muted-foreground sm:type-intro">
                  {description}
                </DialogDescription>
              </div>

              {isLocalityStep ? (
                localities.data?.length ? (
                  <div className="max-w-xl space-y-4">
                    <img
                      src={welcomePhoto}
                      alt=""
                      className="h-28 w-full rounded-xl object-cover object-[center_32%] sm:h-36 lg:hidden"
                    />
                    <LocalityPicker
                      localities={localities.data}
                      picked={locality}
                      isGuess={isIpGuess}
                      isInvalid={Boolean(message)}
                      onPick={(id) => {
                        setChosenLocality(id)
                        setMessage("")
                      }}
                      onPendingChange={setIsAddingPlace}
                    />
                  </div>
                ) : (
                  <CatalogNotice
                    isPending={localities.isPending}
                    label="lokality"
                    onRetry={() => void localities.refetch()}
                  />
                )
              ) : isProfileStep ? (
                <div className="max-w-xl space-y-3 rounded-2xl border border-card-border bg-card p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor="onboarding-bio">O mně</Label>
                    {bio.trim() === "" ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setBio(
                            `Moje zájmy: ${pickedActivities.map(({ name }) => name).join(", ")}. Hledám partu na společné akce!`,
                          )
                        }
                      >
                        <Sparkles aria-hidden /> Použít moje zájmy
                      </Button>
                    ) : null}
                  </div>
                  <Textarea
                    id="onboarding-bio"
                    rows={5}
                    maxLength={500}
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    aria-describedby="onboarding-bio-visibility"
                  />
                  <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
                    <p id="onboarding-bio-visibility">Tenhle text teď vidíš v profilu jen ty.</p>
                    <span>{bio.length} / 500</span>
                  </div>
                </div>
              ) : categories.length ? (
                isCategoryStep ? (
                  <CategoryPicker
                    categories={categories}
                    selected={preferredCategoryIds}
                    onToggle={(id) =>
                      setPreferredCategoryIds((current) =>
                        current.includes(id)
                          ? current.filter((item) => item !== id)
                          : [...current, id],
                      )
                    }
                  />
                ) : (
                  <InterestPicker
                    categories={categories}
                    preferredCategoryIds={preferredCategoryIds}
                    renderEventPreview={
                      locality
                        ? (categoryId) => renderEventPreview?.(locality, categoryId)
                        : undefined
                    }
                    selected={selected}
                    onToggle={toggleInterest}
                    isDisabled={isWorking}
                  />
                )
              ) : (
                <CatalogNotice
                  isPending={activities.isPending}
                  label="aktivity"
                  onRetry={() => void activities.refetch()}
                />
              )}
            </div>
          </div>

          <footer className="shrink-0 space-y-2 border-t border-card-border bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8">
            {isInterestStep ? (
              <div className="flex min-h-7 items-center gap-2 lg:hidden">
                <p
                  aria-live="polite"
                  className="shrink-0 text-sm font-semibold"
                >
                  Vybráno {selected.length} ze {MAX_INTERESTS}
                </p>
                <div className="flex min-w-0 [scrollbar-width:none] gap-2 overflow-x-auto p-1">
                  {pickedActivities.map((activity) => (
                    <button
                      key={activity.id}
                      type="button"
                      aria-label={`Odebrat ${activity.name}`}
                      disabled={isWorking}
                      onClick={() => toggleInterest(activity.id)}
                      className="flex min-h-9 shrink-0 items-center gap-1 rounded-full border border-tile-border bg-secondary px-2 text-xs text-secondary-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {activity.name}
                      <X
                        aria-hidden
                        className="size-3"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {(!isLocalityStep && message) || finish.isError ? (
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                {finish.isError ? "Nastavení se nepodařilo uložit. Zkus to znovu." : message}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              {!isLocalityStep ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11"
                  disabled={isWorking}
                  onClick={goBack}
                >
                  <ArrowLeft aria-hidden />
                  Zpět
                </Button>
              ) : null}
              {isProfileStep ? (
                <Button
                  type="button"
                  variant="link"
                  className="min-h-11"
                  disabled={isWorking}
                  onClick={() => advance("without-bio")}
                >
                  Teď ne
                </Button>
              ) : isInterestStep ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={isWorking}
                  onClick={() => advance("profile")}
                >
                  Doplnit profil
                </Button>
              ) : null}
              <Button
                type="button"
                size="lg"
                className={cn("ml-auto min-h-11", isInterestStep && "max-sm:w-full")}
                disabled={isWorking}
                onClick={() => advance()}
              >
                {isLocalityStep
                  ? "Pokračovat"
                  : isCategoryStep
                    ? "Ukázat aktivity"
                    : "Uložit a ukázat akce"}
                {finish.isPending ? (
                  <LoaderCircle
                    aria-hidden
                    className="motion-safe:animate-spin"
                  />
                ) : (
                  <ArrowRight aria-hidden />
                )}
              </Button>
            </div>
            {!isProfileStep ? (
              <button
                type="button"
                disabled={isWorking}
                onClick={() => finish.mutate(null)}
                className="block rounded py-1 text-xs text-muted-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                Přeskočit průvodce
              </button>
            ) : null}
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ActivitySlot({
  activity,
  isDisabled,
  onRemove,
}: {
  activity?: Activity
  isDisabled: boolean
  onRemove: (id: string) => void
}) {
  if (!activity) {
    return (
      <li
        aria-hidden
        className="grid min-h-14 place-items-center rounded-lg border border-dashed border-on-hero/35"
      >
        <Plus className="size-4 text-on-hero-muted" />
      </li>
    )
  }
  const photo = activityPhoto(activity.slug)
  return (
    <li className="flex min-h-14 items-center gap-2 rounded-lg border border-on-hero/25 bg-hero-pattern p-2 motion-safe:duration-200 motion-safe:animate-in motion-safe:fade-in">
      {photo ? (
        <img
          src={photo.src}
          alt=""
          className="size-9 shrink-0 rounded-md object-cover"
        />
      ) : null}
      <span className="min-w-0 flex-1 text-sm font-medium wrap-break-word">{activity.name}</span>
      <button
        type="button"
        aria-label={`Odebrat ${activity.name}`}
        disabled={isDisabled}
        className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-on-hero/15 focus-visible:ring-2 focus-visible:ring-on-hero"
        onClick={() => onRemove(activity.id)}
      >
        <X
          aria-hidden
          className="size-4"
        />
      </button>
    </li>
  )
}

function CatalogNotice({
  isPending,
  label,
  onRetry,
}: {
  isPending: boolean
  label: string
  onRetry: () => void
}) {
  return (
    <div className="space-y-2 rounded-xl border border-card-border bg-card p-4">
      <p
        role="status"
        className="text-sm text-muted-foreground"
      >
        {isPending ? `Načítám ${label}…` : `Teď nemůžu načíst ${label}.`}
      </p>
      {!isPending ? (
        <Button
          type="button"
          variant="outline"
          onClick={onRetry}
        >
          Zkusit znovu
        </Button>
      ) : null}
    </div>
  )
}
