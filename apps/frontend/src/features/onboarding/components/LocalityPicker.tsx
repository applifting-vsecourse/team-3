import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowUpRight, ChevronRight, LoaderCircle, MapPin, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { catalogKeys } from "@/lib/catalog/catalogQueryOptions"
import type { Locality } from "@/lib/catalog/catalogSchemas"
import {
  addPlaceAsLocality,
  PLACE_SEARCH_MIN_LENGTH,
  placeSuggestionsQueryOptions,
} from "@/lib/catalog/placeSearch"
import { foldText } from "@/lib/catalog/textSearch"
import { cn } from "@/lib/utils"

import {
  browseLocalities,
  enterChoice,
  findCatalogLocalities,
  listOnlineLocalities,
  type LocalityChoice,
} from "@/features/onboarding/lib/localityChoices"

type LocalityPickerProps = {
  localities: Locality[]
  confirmed: Locality | null
  suggested?: Locality | null
  isDisabled?: boolean
  onPick: (locality: Locality) => void
  onPendingChange: (isPending: boolean) => void
}

export function LocalityPicker({
  localities,
  confirmed,
  suggested,
  isDisabled,
  onPick,
  onPendingChange,
}: LocalityPickerProps) {
  const [query, setQuery] = useState("")
  const [debounced, setDebounced] = useState("")
  const [expandedQuery, setExpandedQuery] = useState("")
  const [activationHint, setActivationHint] = useState("")
  const list = useRef<HTMLUListElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const pendingPick = useRef(false)
  const queryClient = useQueryClient()
  const needle = foldText(query)
  const localResults = useMemo(() => findCatalogLocalities(localities, query), [localities, query])
  const canSearchMaps = needle.length >= PLACE_SEARCH_MIN_LENGTH
  const isExpanded = expandedQuery === needle
  const remoteTerm = canSearchMaps && (localResults.length === 0 || isExpanded) ? query.trim() : ""
  const isCurrent = remoteTerm === debounced
  const places = useQuery(placeSuggestionsQueryOptions(isCurrent ? debounced : ""))

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(remoteTerm), 275)
    return () => clearTimeout(timer)
  }, [remoteTerm])

  const add = useMutation({
    mutationFn: addPlaceAsLocality,
    onSuccess: (locality) => {
      queryClient.setQueryData<Locality[]>(catalogKeys.localities(), (current) =>
        current?.some(({ id }) => id === locality.id) ? current : [...(current ?? []), locality],
      )
      onPick(locality)
    },
    onSettled: () => {
      pendingPick.current = false
      onPendingChange(false)
    },
  })
  const remoteResults =
    remoteTerm && isCurrent && !places.isPlaceholderData
      ? listOnlineLocalities(places.data ?? [], query)
      : []
  const extraResults = remoteResults.filter((result) => {
    if (!("onlinePlace" in result)) return true
    const place = result.onlinePlace
    return !localResults.some(
      (candidate) =>
        "locality" in candidate &&
        foldText(candidate.name) === foldText(place.name) &&
        Math.abs(candidate.locality.lat - place.lat) < 0.03 &&
        Math.abs(candidate.locality.lng - place.lng) < 0.045,
    )
  })
  const choices = needle
    ? [...localResults, ...extraResults]
    : browseLocalities(localities, confirmed, suggested)
  const isSearching = Boolean(remoteTerm && (!isCurrent || places.isFetching))
  const isBusy = isDisabled === true || add.isPending

  function choose(choice: LocalityChoice) {
    if (isBusy || pendingPick.current) return
    setActivationHint("")
    if ("locality" in choice) {
      onPick(choice.locality)
    } else {
      pendingPick.current = true
      onPendingChange(true)
      add.mutate(choice.onlinePlace)
    }
  }

  function keyboardSearch(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing || isBusy) return
    if (event.key === "ArrowDown") {
      event.preventDefault()
      list.current?.querySelector("button")?.focus()
    }
    if (event.key === "Enter") {
      event.preventDefault()
      const choice = needle && enterChoice(choices)
      if (choice) choose(choice)
      else setActivationHint("Vyber místo z nabídky pod vyhledáváním.")
    }
  }

  function keyboardResults(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return
    const buttons = Array.from(
      list.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [],
    )
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const target =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : current + (event.key === "ArrowDown" ? 1 : -1)
    event.preventDefault()
    if (target === -1) input.current?.focus()
    else buttons[target]?.focus()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label
          htmlFor="onboarding-locality"
          className="font-semibold"
        >
          Město, obec nebo městská část
        </Label>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="onboarding-locality"
            ref={input}
            type="search"
            autoComplete="off"
            placeholder="Zkus Praha 8 nebo Břeclav"
            value={query}
            disabled={isBusy}
            aria-controls="onboarding-place-results"
            onKeyDown={keyboardSearch}
            onChange={(event) => {
              setQuery(event.target.value)
              setExpandedQuery("")
              setActivationHint("")
              add.reset()
            }}
            className="h-13 rounded-xl bg-card pl-12 text-base"
          />
        </div>
      </div>
      <div>
        <h2
          className="mb-2 text-sm font-semibold"
          id="onboarding-place-list-title"
        >
          {needle ? "Nalezená místa" : "Vyber místo"}
        </h2>
        <ul
          id="onboarding-place-results"
          ref={list}
          aria-labelledby="onboarding-place-list-title"
          className={cn("grid gap-2 sm:grid-cols-2", !needle && "min-[360px]:grid-cols-2")}
        >
          {choices.map((choice) => (
            <li
              key={choice.key}
              className="min-w-0"
            >
              <Button
                type="button"
                variant="outline"
                aria-label={[choice.name, choice.detail].filter(Boolean).join(" ")}
                disabled={isBusy}
                onClick={() => choose(choice)}
                onKeyDown={keyboardResults}
                className="min-h-12 w-full justify-start gap-3 border-card-border bg-card px-3 text-left whitespace-normal"
              >
                <MapPin
                  aria-hidden
                  className="size-4 shrink-0 text-secondary-foreground"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold wrap-break-word">{choice.name}</span>
                  {choice.detail ? (
                    <span className="block text-xs text-muted-foreground">{choice.detail}</span>
                  ) : null}
                </span>
                {choice.detail === "Odhad podle připojení" || choice.detail === "Poslední výběr" ? (
                  <ArrowUpRight
                    aria-hidden
                    className="size-4"
                  />
                ) : (
                  <ChevronRight
                    aria-hidden
                    className="size-4"
                  />
                )}
              </Button>
            </li>
          ))}
        </ul>
        {add.isPending || isSearching ? (
          <p
            role="status"
            className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"
          >
            <LoaderCircle
              aria-hidden
              className="size-4 motion-safe:animate-spin"
            />
            {add.isPending ? "Ukládám vybrané místo…" : "Hledám místo…"}
          </p>
        ) : needle && choices.length === 0 ? (
          <p
            role="status"
            className="mt-3 text-sm text-muted-foreground"
          >
            {places.isError ? "Hledání se nepodařilo." : "Zkus napsat celý název města nebo obce."}
          </p>
        ) : activationHint ? (
          <p
            role="status"
            className="mt-3 text-sm text-muted-foreground"
          >
            {activationHint}
          </p>
        ) : null}
        {remoteTerm && isCurrent && places.isError ? (
          <Button
            type="button"
            variant="link"
            className="min-h-11 px-0"
            onClick={() => void places.refetch()}
          >
            Zkusit hledat znovu
          </Button>
        ) : canSearchMaps &&
          localResults.length > 0 &&
          !isExpanded &&
          !localResults.some(({ isExact }) => isExact) ? (
          <Button
            type="button"
            variant="link"
            className="min-h-11 px-0"
            onClick={() => setExpandedQuery(needle)}
          >
            Hledat další místa
          </Button>
        ) : null}
        {add.isError ? (
          <p
            role="alert"
            className="mt-3 text-sm text-destructive"
          >
            {add.error.message}
          </p>
        ) : null}
      </div>
    </div>
  )
}
