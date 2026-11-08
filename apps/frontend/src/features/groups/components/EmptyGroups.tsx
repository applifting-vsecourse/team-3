import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import { selectionLabel } from "@/lib/catalog/activitySelection"
import { toActivitySelection, type Catalog } from "@/lib/catalog/catalogSearch"
import {
  ALL_LOCALITIES_SLUG,
  DEFAULT_LOCALITY_SLUG,
  localityName,
} from "@/lib/catalog/localityOptions"

import type { GroupsSearch } from "@/features/groups/lib/groupsSearch"
import { newGroupSearchFrom } from "@/features/groups/lib/newGroupSearch"

type EmptyGroupsProps = {
  search: GroupsSearch
  catalog: Catalog | undefined
  /** A visitor founds a group after signing up, so „Založit skupinu“ goes there first. */
  isVisitor: boolean
  /** Changes some of the URL's filters, like the filter bar. */
  onSearchChange: (patch: Partial<GroupsSearch>) => void
}

/**
 * /skupiny without results (Figma A-07e, A-07ed; UX audit U3): what found nothing, then
 * the ways on — the whole country, without the activity, and founding the group nobody has
 * yet, with the activity and the locality already filled in. As /akce (EmptyEvents, #170).
 *
 * Figma's „V Novém Boru zatím žádná skupina na komunitní zahradu není.“ needs the locality
 * in the locative and the activity in the accusative, which the catalog doesn't have; the
 * filters are named as their chips name them instead.
 */
export function EmptyGroups({ search, catalog, isVisitor, onSearchChange }: EmptyGroupsProps) {
  const isEverywhere = search.lokalita === ALL_LOCALITIES_SLUG
  const hasActivity = search.kategorie !== undefined || search.aktivita !== undefined
  const filters = catalog
    ? [
        localityName(search.lokalita ?? DEFAULT_LOCALITY_SLUG, catalog.localities),
        selectionLabel(toActivitySelection(search), catalog.categories),
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined
  const prefill = newGroupSearchFrom(search)
  const prefillQuery = new URLSearchParams(prefill).toString()

  return (
    <div className="flex flex-col items-start gap-3 py-6">
      <div className="flex flex-col gap-1">
        <p className="text-body">Žádná skupina zatím neodpovídá filtrům:</p>
        {filters ? <p className="text-sm font-semibold">{filters}</p> : null}
      </div>
      {isEverywhere ? null : (
        <Button
          variant="outline"
          size="lg"
          onClick={() => onSearchChange({ lokalita: ALL_LOCALITIES_SLUG })}
        >
          Hledat v celém Česku
        </Button>
      )}
      {hasActivity ? (
        <Button
          variant="outline"
          size="lg"
          onClick={() => onSearchChange({ kategorie: undefined, aktivita: undefined })}
        >
          Zrušit typ aktivity
        </Button>
      ) : null}
      <Button
        asChild
        variant="ghost"
        size="lg"
      >
        {isVisitor ? (
          // the router encodes `from` once; the way back keeps the prefill
          <Link
            to={ROUTES.signup}
            search={{
              from: prefillQuery ? `/skupiny/nova?${prefillQuery}` : "/skupiny/nova",
            }}
          >
            Založit skupinu
          </Link>
        ) : (
          <Link
            to="/skupiny/nova"
            search={prefill}
          >
            Založit skupinu
          </Link>
        )}
      </Button>
    </div>
  )
}
