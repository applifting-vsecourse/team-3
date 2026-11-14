import { useEffect, useRef } from "react"
import type { FieldValues, UseFormReturn } from "react-hook-form"

import { REDUCED_MOTION_QUERY } from "@/hooks/useMediaQuery"

/** How long a smooth scroll gets when the browser doesn't say it ended. */
const SCROLL_END_FALLBACK_MS = 400

/**
 * Runs `onEnd` once the page stops scrolling, or after `SCROLL_END_FALLBACK_MS`: Safari without
 * `scrollend`, or an element already in place, so nothing scrolls and no `scrollend` comes.
 */
function afterScrollEnds(onEnd: () => void) {
  const finish = () => {
    window.removeEventListener("scrollend", finish)
    window.clearTimeout(timeout)
    onEnd()
  }
  window.addEventListener("scrollend", finish)
  const timeout = window.setTimeout(finish, SCROLL_END_FALLBACK_MS)
}

/**
 * `a` comes before `b` when read: fields that overlap in height share a row and are read left
 * to right („Začátek“ before „Konec“), otherwise the higher one comes first („Konec“ before
 * „Minimum“ in the row under it, even though „Minimum“ sits further left).
 */
function isReadBefore(a: DOMRect, b: DOMRect) {
  const isSameRow = a.top < b.bottom && b.top < a.bottom
  return isSameRow ? a.left < b.left : a.top < b.top
}

/**
 * An invalid field: `FormControl` marks it `aria-invalid`; a field that can't carry
 * `aria-invalid` (the map, a region) marks itself `data-invalid`.
 */
const INVALID_FIELD = '[aria-invalid="true"], [data-invalid="true"]'

/**
 * The invalid field the reader meets first, by where it is on the screen, not where it is in
 * the DOM: on the phone a form's two columns become one and `order` interleaves their fields
 * (the event's locality comes right after its activity). On desktop that reads the two columns
 * row by row: the locality at the top of „Kde“ comes before the date lower in „Co a kdy“.
 */
function firstInvalidField(form: HTMLFormElement) {
  const fields = [...form.querySelectorAll<HTMLElement>(INVALID_FIELD)]
  return fields.reduce<HTMLElement | undefined>(
    (first, field) =>
      first && !isReadBefore(field.getBoundingClientRect(), first.getBoundingClientRect())
        ? first
        : field,
    undefined,
  )
}

/**
 * Scrolls `element` to the middle of the screen, clear of the sticky header, then focuses
 * `focusTarget` if there is one. With reduced motion it jumps.
 */
function reveal(element: HTMLElement, focusTarget?: HTMLElement) {
  const isReducedMotion =
    typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION_QUERY).matches
  if (isReducedMotion) {
    element.scrollIntoView({ behavior: "auto", block: "center" })
    focusTarget?.focus({ preventScroll: true })
    return
  }
  element.scrollIntoView({ behavior: "smooth", block: "center" })
  if (!focusTarget) return
  // Focus only once the scroll is over: in iOS Safari a focused input opens the keyboard and
  // Safari scrolls the page itself, cutting the smooth scroll short.
  const focusedAtSubmit = document.activeElement
  afterScrollEnds(() => {
    // whoever tapped another field meanwhile keeps it
    if (document.activeElement === focusedAtSubmit) focusTarget.focus({ preventScroll: true })
  })
}

/**
 * Keeps a form's errors on screen (#190, #291), so none goes unnoticed below the fold or
 * under the sticky header:
 *
 * - after a failed submit it scrolls the first invalid field to the middle of the screen and
 *   focuses it (a field that can't take focus itself, like the map, passes it on),
 * - when `serverError` appears it scrolls to the form's `Alert`, which a screen reader
 *   announces by its `role="alert"`; the focus stays where it is.
 *
 * Give the returned ref to the `<form>`, and turn off react-hook-form's own
 * `shouldFocusError`: it would focus at once and the page would jump to the field before the
 * smooth scroll ends. (Its `setFocus` can't help either: for a field behind `Controller` it
 * holds an object with `focus()`, not the element, and that `focus()` takes no `preventScroll`.)
 */
export function useRevealFormErrors<TFieldValues extends FieldValues>(
  form: Pick<UseFormReturn<TFieldValues>, "formState">,
  serverError?: string | null,
) {
  const formRef = useRef<HTMLFormElement>(null)
  const { submitCount } = form.formState

  // after the render that shows a submit's errors, so their fields are already marked
  useEffect(() => {
    if (submitCount === 0 || !formRef.current) return
    const field = firstInvalidField(formRef.current)
    if (!field) return
    const focusTarget =
      field.tabIndex >= 0 ? field : field.querySelector<HTMLElement>('[tabindex="0"]')
    reveal(field, focusTarget ?? undefined)
  }, [submitCount])

  useEffect(() => {
    if (!serverError) return
    const alert = formRef.current?.querySelector<HTMLElement>('[role="alert"]')
    if (alert) reveal(alert)
  }, [serverError])

  return formRef
}
