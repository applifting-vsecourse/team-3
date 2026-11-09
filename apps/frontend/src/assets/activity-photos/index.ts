// The activity photo library (DESIGN.md › Event card): one photo per activity, by its slug,
// never an organizer's upload. Each in two widths, `<slug>-480.webp` and `<slug>-960.webp`.
// Every catalog activity has one; an activity added before its photo shows its Activity tile
// instead. Adding a photo is adding the two files — see README.md here.
const files = import.meta.glob<string>("./*.webp", {
  eager: true,
  query: "?url",
  import: "default",
})

export type ActivityPhoto = { src: string; srcSet: string }

const photos = new Map<string, ActivityPhoto>()
for (const [path, url] of Object.entries(files)) {
  const match = /\.\/(.+)-(480|960)\.webp$/.exec(path)
  if (!match) continue
  const [, slug = "", width = ""] = match
  const small = files[`./${slug}-480.webp`]
  const large = files[`./${slug}-960.webp`]
  if (width !== "480" || !small || !large) continue
  photos.set(slug, { src: url, srcSet: `${small} 480w, ${large} 960w` })
}

/** The photo of an activity, or undefined where the library has none yet. */
export const activityPhoto = (slug: string): ActivityPhoto | undefined => photos.get(slug)
