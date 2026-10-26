import type { Activity, ActivityCategory } from "@/lib/catalog/catalogSchemas"
import { foldText } from "@/lib/catalog/textSearch"

/**
 * Selected activity types as slugs, the shape of ?kategorie= and ?aktivita=.
 * A category in `categories` means the whole category, including activities
 * added to it later; its activities are then not listed one by one.
 */
export type ActivitySelection = { categories: string[]; activities: string[] }

export type CheckState = "on" | "mixed" | "off"

export function categoryState(
  selection: ActivitySelection,
  category: ActivityCategory,
): CheckState {
  if (selection.categories.includes(category.slug)) return "on"
  return category.activities.some((a) => selection.activities.includes(a.slug)) ? "mixed" : "off"
}

export const isActivityChecked = (
  selection: ActivitySelection,
  category: ActivityCategory,
  activity: Activity,
): boolean =>
  selection.categories.includes(category.slug) || selection.activities.includes(activity.slug)

const withoutActivitiesOf = (activities: string[], category: ActivityCategory) =>
  activities.filter((slug) => !category.activities.some((a) => a.slug === slug))

/** Checking a category (also a half-checked one) selects all of it; unchecking clears it. */
export function toggleCategory(
  selection: ActivitySelection,
  category: ActivityCategory,
): ActivitySelection {
  const activities = withoutActivitiesOf(selection.activities, category)
  if (categoryState(selection, category) === "on") {
    return { categories: selection.categories.filter((c) => c !== category.slug), activities }
  }
  return { categories: [...selection.categories, category.slug], activities }
}

export function toggleActivity(
  selection: ActivitySelection,
  category: ActivityCategory,
  activity: Activity,
): ActivitySelection {
  // Unchecking one activity of a whole category keeps the others, one by one.
  if (selection.categories.includes(category.slug)) {
    return {
      categories: selection.categories.filter((c) => c !== category.slug),
      activities: [
        ...selection.activities,
        ...category.activities.filter((a) => a.slug !== activity.slug).map((a) => a.slug),
      ],
    }
  }
  if (selection.activities.includes(activity.slug)) {
    return { ...selection, activities: selection.activities.filter((a) => a !== activity.slug) }
  }
  const activities = [...selection.activities, activity.slug]
  // All of them picked one by one is the whole category.
  if (category.activities.every((a) => activities.includes(a.slug))) {
    return {
      categories: [...selection.categories, category.slug],
      activities: withoutActivitiesOf(activities, category),
    }
  }
  return { ...selection, activities }
}

/** Chip value: nothing, the one selected name, or „Typ aktivity (3)“ like „Moje zájmy (5)“ in Figma. */
export function selectionLabel(
  selection: ActivitySelection,
  categories: ActivityCategory[],
  filterName = "Typ aktivity",
): string | undefined {
  // slugs the catalog doesn't know are dropped from the query, so don't count them
  const names = [
    ...categories.filter((c) => selection.categories.includes(c.slug)),
    ...categories.flatMap((c) => c.activities).filter((a) => selection.activities.includes(a.slug)),
  ].map((item) => item.name)
  if (names.length === 0) return undefined
  return names.length === 1 ? names[0] : `${filterName} (${names.length})`
}

/** „Hledat aktivitu“: name or synonyms, ignoring case and diacritics („pinces“ finds stolní tenis). */
export function searchActivities(
  categories: ActivityCategory[],
  query: string,
): { category: ActivityCategory; activity: Activity }[] {
  const needle = foldText(query)
  if (!needle) return []
  return categories.flatMap((category) =>
    category.activities
      .filter((activity) =>
        [activity.name, ...activity.keywords].some((t) => foldText(t).includes(needle)),
      )
      .map((activity) => ({ category, activity })),
  )
}
