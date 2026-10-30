import { useLayoutEffect, useRef, type RefObject } from "react"

/**
 * Once, when the list mounts (a picker opening), scrolls it so its
 * `[data-picked]` row sits in the middle: the picked town may be far down the
 * alphabet, out of sight. Once the user types, the list goes back to its top,
 * where the best match is, the row Enter picks: left down at the picked town,
 * a shorter list of results showed only its end.
 */
export function useScrollToPicked(listRef: RefObject<HTMLElement | null>, query: string) {
  useLayoutEffect(() => {
    const list = listRef.current
    const picked = list?.querySelector("[data-picked]")
    if (!list || !picked) return
    list.scrollTop +=
      picked.getBoundingClientRect().top - list.getBoundingClientRect().top - list.clientHeight / 2
  }, [listRef])

  const searched = useRef(query)
  useLayoutEffect(() => {
    if (searched.current === query) return
    searched.current = query
    if (listRef.current) listRef.current.scrollTop = 0
  }, [listRef, query])
}
