import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { ArrowLeft, ArrowRight, Check, Compass, LoaderCircle, MapPin, X } from "lucide-react"
import { z } from "zod"

import { LocalityCombobox } from "@/components/CatalogCombobox/LocalityCombobox"
import { PageBand } from "@/components/PageBand/PageBand"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api-client"
import { activityTreeQueryOptions, localitiesQueryOptions } from "@/lib/catalog/catalogQueryOptions"
import { defaultLocalityQueryOptions } from "@/lib/catalog/defaultLocality"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { InterestPicker } from "./InterestPicker"

const MAX_INTERESTS = 3
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

type OnboardingWizardProps = {
  viewerId: string
  onFinish: (result: OnboardingResult, preferencesSaved: boolean) => Promise<void>
}

export function OnboardingWizard({ viewerId, onFinish }: OnboardingWizardProps) {
  const heading = useRef<HTMLHeadingElement>(null)
  const localityControl = useRef<HTMLButtonElement>(null)
  const [step, setStep] = useState(1)
  const [chosenLocality, setChosenLocality] = useState<string>()
  const [selected, setSelected] = useState<string[]>([])
  const [message, setMessage] = useState("")

  const localities = useQuery(localitiesQueryOptions())
  const defaultLocality = useQuery(defaultLocalityQueryOptions(viewerId))
  const activities = useQuery(activityTreeQueryOptions())
  const suggestedId = defaultLocality.data?.locality?.id
  const locality = localities.data?.find(({ id }) => id === (chosenLocality ?? suggestedId))
  const localityId = locality?.id ?? ""
  const isIpGuess =
    chosenLocality === undefined && localityId && defaultLocality.data?.source === "ip"
  const localityHint = isIpGuess
    ? "Lokalitu jsme odhadli. Pokud nesedí, změň ji."
    : "Lokalitu můžeš později změnit v profilu."
  const categories = activities.data ?? []
  const activityNames = new Map(
    categories.flatMap((category) =>
      category.activities.map((activity) => [activity.id, activity.name] as const),
    ),
  )

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
    heading.current?.focus()
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

  const advance = () => {
    if (!localityId) {
      setMessage("Vyber lokalitu ze seznamu.")
      localityControl.current?.focus()
      return
    }
    if (step === 1) {
      setChosenLocality(localityId)
      setMessage("")
      setStep(2)
      return
    }
    if (!selected.length) {
      setMessage("Vyber aspoň jednu aktivitu, která tě baví.")
      return
    }
    setMessage("")
    finish.mutate({ homeLocalityId: localityId, interestIds: selected })
  }

  return (
    <>
      <PageBand
        variant="detail"
        title="Vítej v HobbyHubu"
        description="Nastav si, odkud jsi a co tě baví. Snáz najdeš akce, které ti sednou."
      />
      <div className={cn(PAGE, "gap-4 md:flex-row md:items-start md:gap-8 lg:gap-12")}>
        <aside className="md:sticky md:top-6 md:w-64 md:shrink-0 lg:w-80">
          <ol
            aria-label="Kroky onboardingu"
            className="grid grid-cols-2 gap-2 md:grid-cols-1"
          >
            {[
              { number: 1, name: "Lokalita", icon: MapPin },
              { number: 2, name: "Zájmy", icon: Compass },
            ].map(({ number, name, icon: Icon }) => (
              <li
                key={number}
                aria-current={number === step ? "step" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-lg border border-control-border bg-card px-3 py-2 text-sm",
                  number === step &&
                    "border-primary-edge bg-secondary font-semibold text-secondary-foreground",
                )}
              >
                <Icon
                  aria-hidden
                  className="size-4 shrink-0"
                />
                <span className="flex-1">
                  {number}. {name}
                </span>
                {number < step ? (
                  <Check
                    aria-label="Vybráno"
                    className="size-4 shrink-0"
                  />
                ) : null}
              </li>
            ))}
          </ol>
          {step === 2 && locality ? (
            <div className="mt-4 hidden rounded-2xl border border-card-border bg-card p-4 md:block">
              <p className="text-sm text-muted-foreground">Domovská lokalita</p>
              <p className="mt-1 font-semibold">{locality.name}</p>
            </div>
          ) : null}
        </aside>

        <section
          aria-labelledby="onboarding-step-title"
          className="min-w-0 flex-1 md:max-w-3xl"
        >
          <div
            key={step}
            className="space-y-4 motion-safe:duration-200 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
          >
            <div className="space-y-1">
              <h2
                ref={heading}
                id="onboarding-step-title"
                tabIndex={-1}
                className="type-feature"
              >
                {step === 1 ? "Kde hledáš akce?" : "Co tě baví?"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {step === 1
                  ? "Vyber město, obec nebo městskou část, kde chceš začít."
                  : "Vyber až 3 aktivity. Podle nich ti nabídneme akce v okolí."}
              </p>
            </div>
            {step === 1 ? (
              <div className="max-w-md space-y-2 rounded-2xl border border-card-border bg-card p-4">
                {localities.data?.length ? (
                  <>
                    <Label htmlFor="onboarding-locality">Domovská lokalita</Label>
                    <LocalityCombobox
                      ref={localityControl}
                      id="onboarding-locality"
                      localities={localities.data}
                      value={localityId}
                      onChange={(id) => {
                        setChosenLocality(id)
                        setMessage("")
                      }}
                      disabled={finish.isPending}
                      aria-invalid={Boolean(message)}
                      aria-describedby="onboarding-locality-hint"
                      className="min-h-11"
                    />
                    <p
                      id="onboarding-locality-hint"
                      role={message ? "alert" : undefined}
                      className={cn(
                        "text-sm",
                        message ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {message || localityHint}
                    </p>
                  </>
                ) : localities.isPending ? (
                  <p
                    role="status"
                    className="text-sm text-muted-foreground"
                  >
                    Načítám lokality…
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p
                      role="status"
                      className="text-sm"
                    >
                      Seznam lokalit je teď nedostupný.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void localities.refetch()}
                    >
                      Zkusit znovu
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p
                    aria-live="polite"
                    className="text-sm font-semibold"
                  >
                    Vybráno {selected.length} ze {MAX_INTERESTS}
                  </p>
                  {selected.length ? (
                    <ul
                      aria-label="Vybrané aktivity"
                      className="flex flex-wrap gap-2"
                    >
                      {selected.map((id) => (
                        <li key={id}>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9 rounded-full bg-secondary text-secondary-foreground motion-reduce:transition-none"
                            aria-label={`Odebrat ${activityNames.get(id)}`}
                            disabled={finish.isPending}
                            onClick={() => toggleInterest(id)}
                          >
                            {activityNames.get(id)}
                            <X aria-hidden />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                {categories.length ? (
                  <InterestPicker
                    categories={categories}
                    selected={selected}
                    onToggle={toggleInterest}
                    isDisabled={finish.isPending}
                  />
                ) : activities.isPending ? (
                  <p
                    role="status"
                    className="text-sm text-muted-foreground"
                  >
                    Načítám aktivity…
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p
                      role="status"
                      className="text-sm"
                    >
                      Seznam aktivit je teď nedostupný.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void activities.refetch()}
                    >
                      Zkusit znovu
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="sticky bottom-16 z-10 mt-3 space-y-2 border-t border-border bg-background py-3 md:static md:mt-5">
            {(step === 2 && message) || finish.isError ? (
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                {finish.isError ? "Nastavení se nepodařilo uložit. Zkus to znovu." : message}
              </p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                size="lg"
                className="min-h-11 sm:order-last sm:ml-auto"
                disabled={finish.isPending}
                onClick={advance}
              >
                {step === 1 ? "Pokračovat" : "Uložit a ukázat akce"}
                {finish.isPending ? (
                  <LoaderCircle
                    aria-hidden
                    className="motion-safe:animate-spin"
                  />
                ) : (
                  <ArrowRight aria-hidden />
                )}
              </Button>
              <div className="flex justify-center gap-2">
                {step === 2 ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={finish.isPending}
                    className="min-h-10"
                    onClick={() => {
                      finish.reset()
                      setMessage("")
                      setStep(1)
                    }}
                  >
                    <ArrowLeft aria-hidden />
                    Zpět
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="link"
                  disabled={finish.isPending}
                  className="min-h-10"
                  onClick={() => {
                    setMessage("")
                    finish.mutate(null)
                  }}
                >
                  Teď ne
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
