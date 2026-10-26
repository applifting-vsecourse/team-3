import { useMemo } from "react"

import {
  CatalogCombobox,
  type CatalogComboboxGroup,
  type CatalogComboboxProps,
} from "@/components/CatalogCombobox/CatalogCombobox"
import type { Locality } from "@/lib/catalog/catalogSchemas"
import { localityOptions } from "@/lib/catalog/localityOptions"

type LocalityComboboxProps = Omit<
  CatalogComboboxProps,
  | "groups"
  | "placeholder"
  | "searchLabel"
  | "searchPlaceholder"
  | "listLabel"
  | "emptyMessage"
  | "fallback"
> & { localities: Locality[] }

/**
 * Lokalita in a form: hundreds of towns, so it is typed („usti nad orl“), not
 * scrolled. Praha and its districts come first, then towns alphabetically.
 */
export function LocalityCombobox({ localities, ...props }: LocalityComboboxProps) {
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
      groups={groups}
      placeholder="Vyber lokalitu"
      searchLabel="Hledat lokalitu"
      listLabel="Lokality"
      searchPlaceholder="Hledej město…"
      emptyMessage="Takové město v katalogu nemáme. Vyber nejbližší."
    />
  )
}
