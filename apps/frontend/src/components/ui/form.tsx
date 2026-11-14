import * as React from "react"
import type { Label as LabelPrimitive } from "radix-ui"
import { Slot } from "radix-ui"
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form"

import { Label } from "@/components/ui/label"
import { REDUCED_MOTION_QUERY } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState } = useFormContext()
  const formState = useFormState({ name: fieldContext.name })
  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue)

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div
        data-slot="form-item"
        className={cn("grid gap-2", className)}
        {...props}
      />
    </FormItemContext.Provider>
  )
}

function FormLabel({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const { error, formItemId } = useFormField()

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn("data-[error=true]:text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  )
}

function FormControl({ ...props }: React.ComponentProps<typeof Slot.Root>) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot.Root
      data-slot="form-control"
      id={formItemId}
      aria-describedby={!error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={!!error}
      {...props}
    />
  )
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField()

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message ?? "") : props.children

  if (!body) {
    return null
  }

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn("text-sm text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  )
}

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

/** `a` comes before `b` when read: higher up in the same column, or in a column to the left. */
function isReadBefore(a: DOMRect, b: DOMRect) {
  const isSameColumn = a.left < b.right && b.left < a.right
  return isSameColumn ? a.top < b.top : a.left < b.left
}

/**
 * An invalid field: `FormControl` marks it `aria-invalid`; a field that can't carry
 * `aria-invalid` (the map, a region) marks itself `data-invalid`.
 */
const INVALID_FIELD = '[aria-invalid="true"], [data-invalid="true"]'

/**
 * The invalid field the reader meets first. Not the first in the DOM: on the phone a form's
 * two columns become one and `order` interleaves their fields (the event's locality comes
 * right after its activity), on desktop the left column is read before the right one.
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
function useRevealFormErrors<TFieldValues extends FieldValues>(
  form: Pick<UseFormReturn<TFieldValues>, "formState">,
  serverError?: string | null,
) {
  const formRef = React.useRef<HTMLFormElement>(null)
  const { submitCount } = form.formState

  // after the render that shows a submit's errors, so their fields are already marked
  React.useEffect(() => {
    if (submitCount === 0 || !formRef.current) return
    const field = firstInvalidField(formRef.current)
    if (!field) return
    const focusTarget =
      field.tabIndex >= 0 ? field : field.querySelector<HTMLElement>('[tabindex="0"]')
    reveal(field, focusTarget ?? undefined)
  }, [submitCount])

  React.useEffect(() => {
    if (!serverError) return
    const alert = formRef.current?.querySelector<HTMLElement>('[role="alert"]')
    if (alert) reveal(alert)
  }, [serverError])

  return formRef
}

export {
  useFormField,
  useRevealFormErrors,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}
