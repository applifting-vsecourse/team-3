import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

import {
  CatalogCombobox,
  type CatalogComboboxGroup,
  type CatalogComboboxProps,
} from "@/components/CatalogCombobox/CatalogCombobox"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { catalogKeys } from "@/lib/catalog/catalogQueryOptions"
import type { Locality } from "@/lib/catalog/catalogSchemas"
import { localityOptions } from "@/lib/catalog/localityOptions"
import {
  addPlaceAsLocality,
  PLACE_SEARCH_MIN_LENGTH,
  placeSuggestionsQueryOptions,
  type OnlinePlace,
} from "@/lib/catalog/placeSearch"
import { foldText } from "@/lib/catalog/textSearch"

type LocalityComboboxProps = Omit<
  CatalogComboboxProps,
  | "groups"
  | "placeholder"
  | "searchLabel"
  | "searchPlaceholder"
  | "listLabel"
  | "emptyMessage"
  | "fallback"
  | "renderMore"
> & { localities: Locality[] }

/**
 * Lokalita in a form: hundreds of towns, so it is typed („usti nad orl“), not
 * scrolled. Praha and its districts come first, then towns alphabetically.
 * Under them, places from OpenStreetMap: any village („Přívrat“) can be
 * picked and becomes a locality.
 */
export function LocalityCombobox({ localities, onChange, ...props }: LocalityComboboxProps) {
  const groups = useMemo<CatalogComboboxGroup[]>(
    () => [
      {
        items: localityOptions(localities).map((locality) => ({
          id: locality.id,
          name: locality.name,
          isIndented: locality.isDistrict,
        })),
      },
    ],
    [localities],
  )
  return (
    <CatalogCombobox
      {...props}
      onChange={onChange}
      groups={groups}
      placeholder="Vyber lokalitu"
      searchLabel="Hledat lokalitu"
      listLabel="Lokality"
      searchPlaceholder="Hledej město nebo obec…"
      emptyMessage="V našem seznamu není. Vyber obec z mapových podkladů níž."
      renderMore={(query, pick) => (
        <OnlinePlaces
          query={query}
          localities={localities}
          onPicked={pick}
        />
      )}
    />
  )
}

const DEBOUNCE_MS = 300
/** A catalog locality of the same name this close is the same place, already in the list. */
const SAME_PLACE_KM = 10

// equirectangular distance: plenty at the scale of Czechia
const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const toRad = Math.PI / 180
  const x = (b.lng - a.lng) * toRad * Math.cos(((a.lat + b.lat) / 2) * toRad)
  const y = (b.lat - a.lat) * toRad
  return Math.hypot(x, y) * 6371
}

function OnlinePlaces({
  query,
  localities,
  onPicked,
}: {
  query: string
  localities: Locality[]
  onPicked: (id: string) => void
}) {
  const [text, setText] = useState(query)
  useEffect(() => {
    const timeout = setTimeout(() => setText(query), DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [query])
  const places = useQuery(placeSuggestionsQueryOptions(text))
  const queryClient = useQueryClient()
  const add = useMutation({
    mutationFn: addPlaceAsLocality,
    onSuccess: (locality) => {
      // the form's catalog knows it at once, so the field shows its name
      queryClient.setQueryData<Locality[]>(catalogKeys.localities(), (current) =>
        current && !current.some((l) => l.id === locality.id) ? [...current, locality] : current,
      )
      onPicked(locality.id)
    },
  })

  if (foldText(query).length < PLACE_SEARCH_MIN_LENGTH) return null
  const fresh = (places.data ?? []).filter(
    (place: OnlinePlace) =>
      !localities.some((l) => l.name === place.name && distanceKm(l, place) <= SAME_PLACE_KM),
  )
  return (
    <CommandGroup heading="Obce a místa (OpenStreetMap)">
      {fresh.map((place) => (
        <CommandItem
          key={place.key}
          value={`misto:${place.key}`}
          disabled={add.isPending}
          onSelect={() => add.mutate(place)}
          className="flex-col items-start gap-0 rounded-md px-3 py-2 text-base md:text-sm"
        >
          <span>{place.name}</span>
          {place.area ? <span className="text-xs text-muted-foreground">{place.area}</span> : null}
        </CommandItem>
      ))}
      {places.isFetching || add.isPending ? (
        <p
          role="status"
          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground"
        >
          <Loader2
            aria-hidden
            className="size-4 animate-spin"
          />
          {add.isPending ? "Ukládám místo…" : "Hledám obce…"}
        </p>
      ) : null}
      {!places.isFetching && places.isSuccess && fresh.length === 0 ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">Jinou obec tohoto jména nevidím.</p>
      ) : null}
      {add.isError ? (
        <p
          role="alert"
          className="px-3 py-2 text-sm text-destructive"
        >
          {add.error.message}
        </p>
      ) : null}
    </CommandGroup>
  )
}
