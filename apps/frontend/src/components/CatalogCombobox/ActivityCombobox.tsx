import { useMemo } from "react"

import {
  CatalogCombobox,
  type CatalogComboboxGroup,
  type CatalogComboboxProps,
} from "@/components/CatalogCombobox/CatalogCombobox"
import { isOtherActivity } from "@/lib/catalog/activitySelection"
import type { ActivityCategory } from "@/lib/catalog/catalogSchemas"

type ActivityComboboxProps = Omit<
  CatalogComboboxProps,
  | "groups"
  | "placeholder"
  | "searchLabel"
  | "searchPlaceholder"
  | "listLabel"
  | "emptyMessage"
  | "fallback"
> & { categories: ActivityCategory[] }

/**
 * Aktivita in a form: searched by name and synonyms („závody“ finds Atletika,
 * „darts“ Šipky a bowling), listed under their categories. When nothing
 * matches, the categories' „Jiné…“ are offered.
 */
export function ActivityCombobox({ categories, ...props }: ActivityComboboxProps) {
  const groups = useMemo<CatalogComboboxGroup[]>(
    () =>
      categories.map((category) => ({
        heading: category.name,
        items: category.activities.map((activity) => ({
          id: activity.id,
          name: activity.name,
          label: `${category.name} › ${activity.name}`,
          keywords: activity.keywords,
        })),
      })),
    [categories],
  )
  const others = useMemo(
    () => groups.flatMap((group) => group.items.filter((item) => isOtherActivity(item.name))),
    [groups],
  )
  return (
    <CatalogCombobox
      {...props}
      groups={groups}
      placeholder="Vyber aktivitu"
      searchLabel="Hledat aktivitu"
      listLabel="Aktivity"
      searchPlaceholder="Hledej aktivitu…"
      emptyMessage="Takovou aktivitu v katalogu nemáme. Vyber, kam nejvíc patří:"
      fallback={others}
    />
  )
}
