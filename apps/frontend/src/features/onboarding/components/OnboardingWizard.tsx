import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { NetworkError, TimeoutError } from "ky"
import { ArrowLeft, MapPin } from "lucide-react"
import { z } from "zod"

import { Logo } from "@/components/Logo/Logo"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { api, HTTPError } from "@/lib/api-client"
import { activityTreeQueryOptions, localitiesQueryOptions } from "@/lib/catalog/catalogQueryOptions"
import type { Activity, ActivityCategory, Locality } from "@/lib/catalog/catalogSchemas"
import { defaultLocalityQueryOptions } from "@/lib/catalog/defaultLocality"
import { cn } from "@/lib/utils"

import { resolveActivities } from "@/features/onboarding/lib/activityScenes"
import {
  INTEREST_GOAL,
  moveOnboarding,
  reviewOnboarding,
  startOnboarding,
} from "@/features/onboarding/lib/onboardingFlow"

import { InterestPicker } from "./InterestPicker"
import { InterestTray } from "./InterestTray"
import { LocalityPicker } from "./LocalityPicker"
import { OnboardingArtwork } from "./OnboardingArtwork"
import { OnboardingDecision, OnboardingExit } from "./OnboardingDecision"
import { photoFlight, SelectionFlight, type PhotoFlight } from "./SelectionFlight"

import "./onboarding-motion.css"

const resultSchema = z.object({
  onboardingCompletedAt: z.string(),
  localitySlug: z.string().nullable(),
  hasInterests: z.boolean(),
})

type Preferences = {
  homeLocalityId: string
  interestIds: string[]
}

export type OnboardingResult = z.infer<typeof resultSchema>

type FinishInput = Preferences | null

type OnboardingWizardProps = {
  viewerId: string
  renderEventPreview?: (locality: Locality, categoryId: string) => ReactNode
  onFinish: (result: OnboardingResult, hasSubmittedPreferences: boolean) => Promise<void>
}

const EMPTY_CATEGORIES: ActivityCategory[] = []

const STAGE_COPY = {
  locality: {
    title: "Kde se potkáme?",
    hint: "Vyber místo, odkud chceš hledat akce.",
  },
  interests: {
    title: "Co tě baví?",
    hint: "Vyber jednu až tři aktivity, na které máš chuť.",
  },
}

export function OnboardingWizard({
  viewerId,
  onFinish,
  renderEventPreview,
}: OnboardingWizardProps) {
  const [flow, dispatch] = useReducer(moveOnboarding, undefined, startOnboarding)
  const [flight, setFlight] = useState<PhotoFlight>()
  const [isSavingPlace, setIsSavingPlace] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const dialogContent = useRef<HTMLDivElement>(null)
  const restore = useRef<HTMLElement | null>(null)
  const requestPending = useRef(false)
  const localities = useQuery(localitiesQueryOptions())
  const estimate = useQuery(defaultLocalityQueryOptions(viewerId))
  const activities = useQuery(activityTreeQueryOptions())
  const categories = activities.data ?? EMPTY_CATEGORIES
  const activeCategory = categories.find(({ id }) => id === flow.categoryId)
  const picked = useMemo(
    () => resolveActivities(categories, flow.interestIds),
    [categories, flow.interestIds],
  )
  const { title, hint } = STAGE_COPY[flow.stage]
  const isPlaceStep = flow.stage === "locality"
  const isInterestStep = flow.stage === "interests"

  const finish = useMutation({
    mutationFn: async (input: FinishInput) => {
      const request = input
        ? api.post("me/profile/onboarding", { json: input })
        : api.post("me/profile/onboarding/skip", {
            json: {},
            // The backend returns the existing completion marker on repeat.
            retry: {
              limit: 1,
              methods: ["post"],
              statusCodes: [408, 500, 502, 503, 504],
              retryOnTimeout: true,
            },
          })
      return resultSchema.parse(await request.json())
    },
    onSuccess: (result, input) => onFinish(result, input !== null),
    onSettled: () => {
      requestPending.current = false
    },
  })

  useLayoutEffect(() => {
    if (content.current) content.current.scrollTop = 0
  }, [flow.stage])

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [flow.stage])

  function preferences(): Preferences | undefined {
    if (!reviewOnboarding(flow) || !flow.locality || picked.length !== flow.interestIds.length) {
      return
    }
    return { homeLocalityId: flow.locality.id, interestIds: flow.interestIds }
  }

  function submit(mode: "preferences" | "exit") {
    const input = mode === "exit" ? null : preferences()
    if (requestPending.current || input === undefined) return
    requestPending.current = true
    finish.mutate(input)
  }

  function chooseInterest(activity: Activity, target?: HTMLButtonElement) {
    if (finish.isPending || flow.overlay) return
    const index = flow.interestIds.length
    if (!flow.interestIds.includes(activity.id) && index < INTEREST_GOAL && target) {
      if (index + 1 === INTEREST_GOAL) {
        // The third pick opens the confirmation; focus returns to the card when it closes.
        restore.current = target
        setFlight(undefined)
      } else {
        const slot =
          dialogContent.current?.querySelector<HTMLElement>(`[data-interest-slot="${index}"]`) ??
          null
        setFlight(photoFlight(activity.id, activity.slug, target, slot))
      }
    }
    dispatch({ type: "toggle", interestId: activity.id })
  }

  function showExit(target?: HTMLElement) {
    if (finish.isPending || isSavingPlace || flow.overlay) return
    restore.current =
      target ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    finish.reset()
    setFlight(undefined)
    dispatch({ type: "exit" })
  }

  function goBack() {
    finish.reset()
    setFlight(undefined)
    dispatch({ type: "back" })
  }

  function dismissOverlay() {
    finish.reset()
    dispatch({ type: "dismiss" })
  }

  function restoreFocus() {
    const previous = restore.current
    restore.current = null
    if (previous?.isConnected) {
      previous.focus({ preventScroll: true })
    } else if (!dialogContent.current?.contains(document.activeElement)) {
      heading.current?.focus({ preventScroll: true })
    }
  }

  const errorMessage = finish.isError ? "Nastavení se nepodařilo uložit. Zkus to znovu." : undefined
  let exitError: string | undefined
  if (finish.isError) {
    const error = finish.error
    exitError =
      error instanceof NetworkError ||
      error instanceof TimeoutError ||
      (error instanceof HTTPError && error.response.status < 500)
        ? error.message
        : "Průvodce se nepodařilo přeskočit. Zkus to znovu."
  }

  return (
    <>
      <Dialog open>
        <DialogContent
          ref={dialogContent}
          showCloseButton={false}
          overlayClassName="hh-wizard-overlay"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            heading.current?.focus({ preventScroll: true })
          }}
          onPointerDownOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => {
            event.preventDefault()
            showExit()
          }}
          className={cn(
            "flex h-dvh min-h-0 max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 motion-reduce:animate-none sm:w-[calc(100%-2rem)] sm:max-w-6xl sm:rounded-2xl sm:border sm:border-card-border",
            isPlaceStep
              ? "sm:h-[min(630px,calc(100dvh-2rem))]"
              : "sm:h-[min(820px,calc(100dvh-2rem))]",
          )}
        >
          <header className="flex shrink-0 items-center gap-2 border-b border-hero-pattern bg-hero px-3 py-2 text-on-hero sm:px-5">
            {isInterestStep ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Zpět k místu"
                onClick={goBack}
                className="size-11 text-on-hero hover:bg-hero-pattern hover:text-on-hero focus-visible:ring-on-hero"
              >
                <ArrowLeft aria-hidden />
              </Button>
            ) : null}
            <Logo isOnHero />
            <OnboardingProgress stage={flow.stage} />
            <Button
              type="button"
              variant="ghost"
              disabled={finish.isPending || isSavingPlace}
              onClick={(event) => showExit(event.currentTarget)}
              className="min-h-11 px-2 text-on-hero hover:bg-hero-pattern hover:text-on-hero focus-visible:ring-on-hero"
            >
              Teď ne
            </Button>
          </header>

          <div className="flex min-h-0 flex-1">
            <aside className="hidden min-h-0 w-[27%] shrink-0 flex-col border-r border-hero-pattern bg-hero px-2 py-4 md:flex">
              <OnboardingArtwork
                key={flow.stage}
                category={activeCategory}
                interests={picked}
                locality={flow.locality}
              />
            </aside>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div
                ref={content}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-7 sm:py-7"
              >
                <div
                  key={flow.stage}
                  className="hh-wizard-stage mx-auto max-w-4xl space-y-5"
                >
                  <div className="space-y-2">
                    <DialogTitle
                      asChild
                      className="type-title text-balance focus:outline-none"
                    >
                      <h1
                        ref={heading}
                        tabIndex={-1}
                      >
                        {title}
                      </h1>
                    </DialogTitle>
                    <DialogDescription className="max-w-xl text-sm text-muted-foreground sm:text-base">
                      {hint}
                    </DialogDescription>
                    {flow.locality && isInterestStep ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={finish.isPending}
                        onClick={goBack}
                        className="min-h-11 rounded-full bg-card"
                      >
                        <MapPin aria-hidden /> {flow.locality.name}
                      </Button>
                    ) : null}
                  </div>

                  {isPlaceStep ? (
                    <>
                      {localities.data?.length ? (
                        <LocalityPicker
                          localities={localities.data}
                          confirmed={flow.locality}
                          suggested={estimate.data?.locality}
                          isDisabled={finish.isPending}
                          onPendingChange={setIsSavingPlace}
                          onPick={(locality) => dispatch({ type: "pick-place", locality })}
                        />
                      ) : (
                        <CatalogNotice
                          isPending={localities.isPending}
                          label="místa"
                          onRetry={() => void localities.refetch()}
                        />
                      )}
                      <OnboardingArtwork
                        interests={[]}
                        locality={null}
                        isMinor
                      />
                    </>
                  ) : categories.length ? (
                    <InterestPicker
                      categories={categories}
                      categoryId={flow.categoryId}
                      selected={flow.interestIds}
                      isDisabled={finish.isPending}
                      onBrowse={(categoryId) => dispatch({ type: "browse", categoryId })}
                      onToggle={chooseInterest}
                      renderEventPreview={(categoryId) =>
                        flow.locality && renderEventPreview?.(flow.locality, categoryId)
                      }
                    />
                  ) : (
                    <CatalogNotice
                      isPending={activities.isPending}
                      label="aktivity"
                      onRetry={() => void activities.refetch()}
                    />
                  )}
                </div>
              </div>
              {isInterestStep ? (
                <InterestTray
                  interests={picked}
                  isDisabled={finish.isPending}
                  onRemove={(interestId) => dispatch({ type: "toggle", interestId })}
                  onReview={() => {
                    restore.current =
                      document.activeElement instanceof HTMLElement ? document.activeElement : null
                    dispatch({ type: "review" })
                  }}
                />
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {flow.overlay === "decision" && flow.locality ? (
        <OnboardingDecision
          interests={picked}
          locality={flow.locality}
          isSaving={finish.isPending}
          error={errorMessage}
          onSave={() => submit("preferences")}
          onClose={dismissOverlay}
          onRestoreFocus={restoreFocus}
        />
      ) : flow.overlay === "exit" ? (
        <OnboardingExit
          isSaving={finish.isPending}
          error={exitError}
          onStay={dismissOverlay}
          onLeave={() => submit("exit")}
          onRestoreFocus={restoreFocus}
        />
      ) : null}

      <SelectionFlight
        flight={flight}
        onEnd={() => setFlight(undefined)}
      />
    </>
  )
}

function OnboardingProgress({ stage }: { stage: keyof typeof STAGE_COPY }) {
  const position = stage === "locality" ? 1 : 2
  return (
    <div className="ml-auto flex min-w-0 items-center gap-2">
      <span
        aria-hidden
        className="hidden gap-1 sm:flex"
      >
        {[1, 2].map((step) => (
          <span
            key={step}
            className={cn(
              "h-1 w-5 rounded-full",
              step <= position ? "bg-primary" : "bg-on-hero/35",
            )}
          />
        ))}
      </span>
      <span className="text-right text-xs text-on-hero sm:text-sm">{`Krok ${position} ze 2`}</span>
    </div>
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
