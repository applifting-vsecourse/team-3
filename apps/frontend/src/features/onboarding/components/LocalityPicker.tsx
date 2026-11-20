import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, MapPin, Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { catalogKeys } from "@/lib/catalog/catalogQueryOptions"
import type { Locality } from "@/lib/catalog/catalogSchemas"
import { addPlaceAsLocality, placeSuggestionsQueryOptions } from "@/lib/catalog/placeSearch"
import { foldText, matchRank } from "@/lib/catalog/textSearch"
import { cn } from "@/lib/utils"

const SUGGESTED_CITIES = ["praha", "brno", "ostrava", "plzen", "olomouc", "liberec"]

type LocalityPickerProps = {
  localities: Locality[]
  picked?: Locality
  isGuess: boolean
  isInvalid: boolean
  onPick: (id: string) => void
  onPendingChange: (isPending: boolean) => void
}

export function LocalityPicker({
  localities,
  picked,
  isGuess,
  isInvalid,
  onPick,
  onPendingChange,
}: LocalityPickerProps) {
  const [query, setQuery] = useState("")
  const [debounced, setDebounced] = useState("")
  const input = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const needle = foldText(query)
  const matches = needle
    ? localities
        .flatMap((locality) => {
          const rank = matchRank(foldText(locality.name), needle)
          return rank === undefined ? [] : [{ locality, rank }]
        })
        .sort(
          (a, b) =>
            a.rank - b.rank ||
            a.locality.name.localeCompare(b.locality.name, "cs", { numeric: true }),
        )
        .slice(0, 8)
        .map(({ locality }) => locality)
    : SUGGESTED_CITIES.flatMap((slug) => localities.filter((locality) => locality.slug === slug))
  const onlineQuery = needle && matches.length === 0 ? query : ""
  const places = useQuery(placeSuggestionsQueryOptions(debounced === onlineQuery ? debounced : ""))

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(onlineQuery), 300)
    return () => clearTimeout(timer)
  }, [onlineQuery])

  useEffect(() => {
    if (isInvalid) input.current?.focus()
  }, [isInvalid])

  const add = useMutation({
    mutationFn: addPlaceAsLocality,
    onSuccess: (locality) => {
      queryClient.setQueryData<Locality[]>(catalogKeys.localities(), (current) =>
        current?.some(({ id }) => id === locality.id) ? current : [...(current ?? []), locality],
      )
      onPick(locality.id)
      setQuery("")
    },
    onSettled: () => onPendingChange(false),
  })

  return (
    <div className="space-y-4">
      {picked ? (
        <div className="flex items-center gap-3 rounded-xl border border-tile-border bg-secondary p-4 text-secondary-foreground">
          <MapPin
            aria-hidden
            className="size-5 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold wrap-break-word">{picked.name}</p>
            <p className="text-sm">{isGuess ? "Odhad podle připojení" : "Vybraná lokalita"}</p>
          </div>
          <Check
            aria-hidden
            className="size-5 shrink-0"
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="onboarding-locality">Město, obec nebo městská část</Label>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="onboarding-locality"
            ref={input}
            aria-invalid={isInvalid}
            aria-describedby={isInvalid ? "onboarding-locality-error" : undefined}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Třeba Praha 8 nebo Brno"
            className="h-12 rounded-full pl-12"
          />
        </div>
        {isInvalid ? (
          <p
            id="onboarding-locality-error"
            role="alert"
            className="text-sm text-destructive"
          >
            Vyber místo ze seznamu a pokračuj.
          </p>
        ) : null}
      </div>
      <div
        role="group"
        aria-label={needle ? "Výsledky hledání" : "Rychlý výběr měst"}
        className="grid grid-cols-2 gap-2"
      >
        {matches.map((locality) => (
          <button
            key={locality.id}
            type="button"
            aria-pressed={locality.id === picked?.id}
            onClick={() => {
              onPick(locality.id)
              if (!needle) return
              input.current?.focus()
              setQuery("")
            }}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-lg border border-control-border bg-card px-3 py-2 text-left text-sm font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
              locality.id === picked?.id &&
                "border-tile-border bg-secondary text-secondary-foreground",
            )}
          >
            <MapPin
              aria-hidden
              className="size-4 shrink-0"
            />
            <span className="min-w-0 wrap-break-word">{locality.name}</span>
          </button>
        ))}
      </div>
      {onlineQuery && needle.length >= 2 ? (
        <div className="space-y-2">
          {places.isFetching || debounced !== onlineQuery ? (
            <p
              role="status"
              className="text-sm text-muted-foreground"
            >
              Hledám další místa…
            </p>
          ) : null}
          {places.data?.map((place) => (
            <button
              key={place.key}
              type="button"
              disabled={add.isPending}
              onClick={() => {
                onPendingChange(true)
                add.mutate(place)
              }}
              className="flex min-h-11 w-full flex-col rounded-lg border border-control-border bg-card px-3 py-2 text-left text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="font-semibold">{place.name}</span>
              {place.area ? <span className="text-muted-foreground">{place.area}</span> : null}
            </button>
          ))}
          {places.isError ||
          (places.isSuccess && !places.isFetching && places.data.length === 0) ? (
            <p
              role="status"
              className="text-sm text-muted-foreground"
            >
              Zkus celý název obce nebo vyber místo v okolí.
            </p>
          ) : null}
          {add.isPending ? (
            <p
              role="status"
              className="text-sm text-muted-foreground"
            >
              Ukládám místo…
            </p>
          ) : null}
          {add.isError ? (
            <p
              role="alert"
              className="text-sm text-destructive"
            >
              {add.error.message}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
