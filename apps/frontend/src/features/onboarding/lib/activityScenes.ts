import type { Activity, ActivityCategory } from "@/lib/catalog/catalogSchemas"

export const CATEGORY_COVER: Readonly<Record<string, string>> = {
  "tymove-sporty": "volejbal",
  "raketove-sporty": "badminton",
  "pohyb-a-tanec": "tanec",
  outdoor: "turistika",
  hry: "deskove-hry",
  "kvizy-a-jazyky": "pub-kviz",
  "tvoreni-a-hudba": "fotografie",
  komunita: "komunitni-zahrada",
}

export const DISCOVERY_PHOTOS = [
  "volejbal",
  "turistika",
  "deskove-hry",
  "badminton",
  "beh",
  "fotografie",
  "pub-kviz",
  "cyklistika",
  "tanec",
  "komunitni-zahrada",
  "lezeni",
  "spolecne-vareni",
]

export const coverForCategory = (category: ActivityCategory) =>
  CATEGORY_COVER[category.slug] ?? category.activities[0]?.slug ?? ""

export function resolveActivities(categories: ActivityCategory[], ids: string[]): Activity[] {
  const index = new Map(
    categories.flatMap(({ activities }) =>
      activities.map((activity) => [activity.id, activity] as const),
    ),
  )
  return ids.flatMap((id) => {
    const activity = index.get(id)
    return activity ? [activity] : []
  })
}
