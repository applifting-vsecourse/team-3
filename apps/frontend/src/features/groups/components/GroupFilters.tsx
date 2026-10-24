import { useState } from "react"

import { ActivityFilter } from "@/components/ActivityFilter/ActivityFilter"
import { FilterChip } from "@/components/FilterChip/FilterChip"
import { LocalityFilter } from "@/components/LocalityFilter/LocalityFilter"
import { Button } from "@/components/ui/button"
import type { ActivitySelection } from "@/lib/catalog/activitySelection"
import { toActivitySearch, toActivitySelection, type Catalog } from "@/lib/catalog/catalogSearch"

import { useGroups } from "@/features/groups/hooks/useGroups"
import { showGroupsLabel } from "@/features/groups/lib/formatGroup"
import { hasActiveFilters, type GroupsSearch } from "@/features/groups/lib/groupsSearch"

type GroupFiltersProps = {
  search: GroupsSearch
  catalog: Catalog | undefined
  onChange: (patch: Partial<GroupsSearch>) => void
  onClearAll: () => void
}

/** The filter chips of /skupiny (Figma A-07): activity and locality, like on /akce. */
export function GroupFilters({ search, catalog, onChange, onClearAll }: GroupFiltersProps) {
  return (
    <div
      role="group"
      aria-label="Filtry"
      className="flex flex-wrap items-center gap-2"
    >
      {catalog ? (
        <>
          <GroupActivityFilter
            search={search}
            catalog={catalog}
            onChange={onChange}
          />
          <GroupLocalityFilter
            search={search}
            catalog={catalog}
            onChange={(lokalita) => onChange({ lokalita })}
          />
        </>
      ) : (
        // keeps the bar from shifting while the catalog loads
        <>
          <FilterChip disabled>Aktivita</FilterChip>
          <FilterChip disabled>Lokalita</FilterChip>
        </>
      )}
      {hasActiveFilters(search) ? (
        <Button
          variant="ghost"
          className="h-9 shrink-0"
          onClick={onClearAll}
        >
          Zrušit vše
        </Button>
      ) : null}
    </div>
  )
}

/** „Zobrazit N skupin“ for what the panel shows; nothing is fetched while it is closed. */
const usePreviewLabel = (search: GroupsSearch | undefined) => {
  const preview = useGroups(search ?? {}, { isEnabled: search !== undefined })
  return showGroupsLabel(preview.isPlaceholderData ? undefined : preview.groups?.length)
}

function GroupLocalityFilter({
  search,
  catalog,
  onChange,
}: {
  search: GroupsSearch
  catalog: Catalog
  onChange: (lokalita: string | undefined) => void
}) {
  const [draft, setDraft] = useState<string>()
  const applyLabel = usePreviewLabel(
    draft === undefined ? undefined : { ...search, lokalita: draft },
  )
  return (
    <LocalityFilter
      value={search.lokalita}
      localities={catalog.localities}
      onChange={onChange}
      onDraftChange={setDraft}
      applyLabel={applyLabel}
    />
  )
}

function GroupActivityFilter({
  search,
  catalog,
  onChange,
}: {
  search: GroupsSearch
  catalog: Catalog
  onChange: (patch: Pick<GroupsSearch, "kategorie" | "aktivita">) => void
}) {
  const [draft, setDraft] = useState<ActivitySelection>()
  const applyLabel = usePreviewLabel(
    draft === undefined ? undefined : { ...search, ...toActivitySearch(draft) },
  )
  return (
    <ActivityFilter
      filterName="Aktivita"
      selection={toActivitySelection(search)}
      categories={catalog.categories}
      onChange={(selection) => onChange(toActivitySearch(selection))}
      onDraftChange={setDraft}
      applyLabel={applyLabel}
    />
  )
}
