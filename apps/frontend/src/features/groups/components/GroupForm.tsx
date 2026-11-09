import { useEffect, useEffectEvent, useId, useRef } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { ActivityCombobox } from "@/components/CatalogCombobox/ActivityCombobox"
import { LocalityCombobox } from "@/components/CatalogCombobox/LocalityCombobox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { REDUCED_MOTION_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"
import type { Catalog } from "@/lib/catalog/catalogSearch"
import { cn } from "@/lib/utils"

import {
  GROUP_DESCRIPTION_MAX_LENGTH,
  GROUP_NAME_MAX_LENGTH,
  GROUP_TYPES,
  type GroupInput,
  type GroupType,
} from "@/features/groups/api/groupSchemas"

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Vyplň název skupiny")
    .max(GROUP_NAME_MAX_LENGTH, `Název může mít nejvýš ${GROUP_NAME_MAX_LENGTH} znaků`),
  activityId: z.string().min(1, "Skupina potřebuje právě jednu aktivitu"),
  localityId: z.string().min(1, "Skupina potřebuje právě jednu lokalitu"),
  type: z.enum(GROUP_TYPES, { message: "Vyber typ skupiny" }),
  description: z
    .string()
    .trim()
    .max(
      GROUP_DESCRIPTION_MAX_LENGTH,
      `Popis může mít nejvýš ${GROUP_DESCRIPTION_MAX_LENGTH} znaků`,
    ),
})

type FormValues = z.input<typeof schema>

/** Figma D-06: Radio card */
const TYPE_OPTIONS: { value: GroupType; title: string; hint: string }[] = [
  { value: "public", title: "Veřejná", hint: "Kdokoli se přidá jedním klepnutím." },
  { value: "closed", title: "Neveřejná", hint: "O členství se žádá, žádosti schvaluješ ty." },
]

// Mobile keeps the field order of D-06; on desktop the two columns of D-06d sit
// side by side: „O skupině“ | „Kdo se přidá“. The columns are `contents` on
// mobile, so `order` places their fields.
const COLUMN = "contents md:flex md:flex-col md:gap-5"
const COLUMN_HEADING = "hidden text-lg font-semibold tracking-tight md:block"

/** How long a smooth scroll gets when the browser doesn't say it ended. */
const SCROLL_END_FALLBACK_MS = 400

/**
 * Runs `onEnd` once the page stops scrolling, or after `SCROLL_END_FALLBACK_MS`: Safari without
 * `scrollend`, or a field already in place, so nothing scrolls and no `scrollend` comes.
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
 * After a failed submit an error under a field off-screen goes unnoticed (#190): scroll the
 * first invalid field to the middle of the screen, clear of the sticky header, and focus it.
 * `FormControl` marks invalid fields `aria-invalid` and the first one in DOM order wins. On
 * desktop that is the reading order. On the phone it is not: the type (`order-4`) comes after
 * the description (`order-5`) in the DOM. That only works because the type is preselected and
 * can't be invalid; drop the preselection and this needs solving.
 */
function revealFirstInvalid(form: HTMLFormElement | null, isReducedMotion: boolean) {
  const field = form?.querySelector<HTMLElement>('[aria-invalid="true"]')
  if (!field) return
  if (isReducedMotion) {
    field.scrollIntoView({ behavior: "auto", block: "center" })
    field.focus({ preventScroll: true })
    return
  }
  field.scrollIntoView({ behavior: "smooth", block: "center" })
  // Focus only once the scroll is over: in iOS Safari a focused input opens the keyboard and
  // Safari scrolls the page itself, cutting the smooth scroll short.
  const focusedAtSubmit = document.activeElement
  afterScrollEnds(() => {
    // whoever tapped another field meanwhile keeps it
    if (document.activeElement === focusedAtSubmit) field.focus({ preventScroll: true })
  })
}

type GroupFormProps = {
  catalog: Catalog
  /**
   * Editing: the group's current values; founding: nothing, or the activity and locality an
   * empty list didn't find (Figma A-07e).
   */
  initialValues?: Partial<GroupInput>
  submitLabel: string
  /** Under the fields, e.g. „Zakladatel se stane správcem skupiny.“ */
  note?: string
  isSubmitting: boolean
  errorMessage?: string | null
  onSubmit: (input: GroupInput) => void | Promise<void>
}

/** Founding (D-06) and editing (D-07 › Upravit skupinu) share one form. */
export function GroupForm({
  catalog,
  initialValues,
  submitLabel,
  note,
  isSubmitting,
  errorMessage,
  onSubmit,
}: GroupFormProps) {
  const typeId = useId()
  const aboutId = useId()
  const whoId = useId()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    // revealFirstInvalid focuses instead, after scrolling its own way
    shouldFocusError: false,
    defaultValues: {
      name: initialValues?.name ?? "",
      activityId: initialValues?.activityId ?? "",
      localityId: initialValues?.localityId ?? "",
      // a new group is public unless the founder says otherwise (#190)
      type: initialValues?.type ?? "public",
      description: initialValues?.description ?? "",
    },
  })
  const formRef = useRef<HTMLFormElement>(null)
  const { submitCount } = form.formState
  const isReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY)
  // an Effect Event: reads the motion preference, but only a submit runs it
  const revealErrors = useEffectEvent(() => revealFirstInvalid(formRef.current, isReducedMotion))
  // after the render that shows a submit's errors, so their fields are already marked
  useEffect(() => {
    if (submitCount > 0) revealErrors()
  }, [submitCount])

  return (
    <Form {...form}>
      <form
        ref={formRef}
        noValidate
        onSubmit={form.handleSubmit((values) =>
          onSubmit({
            name: values.name.trim(),
            description: values.description.trim() || null,
            activityId: values.activityId,
            localityId: values.localityId,
            type: values.type,
          }),
        )}
        className="flex flex-col gap-5"
      >
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:items-start md:gap-12">
          <div
            role="group"
            aria-labelledby={aboutId}
            className={COLUMN}
          >
            <h2
              id={aboutId}
              className={COLUMN_HEADING}
            >
              O skupině
            </h2>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="order-1 md:order-none">
                  <FormLabel>Název skupiny *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="např. Deskovky Holešovice"
                      autoComplete="off"
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="activityId"
              render={({ field }) => (
                <FormItem className="order-2 md:order-none">
                  <FormLabel>Aktivita *</FormLabel>
                  <FormControl>
                    <ActivityCombobox
                      categories={catalog.categories}
                      ref={field.ref}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="localityId"
              render={({ field }) => (
                <FormItem className="order-3 md:order-none">
                  <FormLabel>Lokalita *</FormLabel>
                  <FormControl>
                    <LocalityCombobox
                      localities={catalog.localities}
                      ref={field.ref}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="order-5 md:order-none">
                  <FormLabel>Popis</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="např. Pravidelné deskovky v klubovně, hlavně středně těžké hry."
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div
            role="group"
            aria-labelledby={whoId}
            className={COLUMN}
          >
            <h2
              id={whoId}
              className={COLUMN_HEADING}
            >
              Kdo se přidá
            </h2>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="order-4 md:order-none">
                  <FormLabel>Typ skupiny *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      ref={field.ref}
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      className="gap-2"
                    >
                      {TYPE_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          htmlFor={`${typeId}-${option.value}`}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-accent",
                            field.value === option.value && "border-foreground",
                          )}
                        >
                          <RadioGroupItem
                            id={`${typeId}-${option.value}`}
                            value={option.value}
                          />
                          <span className="flex flex-col">
                            <span className="text-sm font-semibold">{option.title}</span>
                            <span className="text-sm text-muted-foreground">{option.hint}</span>
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {note ? (
              <p className="order-6 text-sm text-muted-foreground md:order-none">{note}</p>
            ) : null}
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          // D-06d: under both columns, as wide as its label on desktop
          className="h-11 w-full md:w-auto md:self-start"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </form>
    </Form>
  )
}
