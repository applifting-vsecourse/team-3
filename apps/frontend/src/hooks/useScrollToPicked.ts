import { useLayoutEffect, type RefObject } from "react"

/**
 * Once, when the list mounts (a picker opening), scrolls it so its
 * `[data-picked]` row sits in the middle: the picked town may be far down the
 * alphabet, out of sight.
 */
export function useScrollToPicked(listRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const list = listRef.current
    const picked = list?.querySelector("[data-picked]")
    if (!list || !picked) return
    list.scrollTop +=
      picked.getBoundingClientRect().top - list.getBoundingClientRect().top - list.clientHeight / 2
  }, [listRef])
}
