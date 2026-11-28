import { useId, useMemo, useState, type Ref } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronDown, Loader2, Users } from "lucide-react"
import { cs } from "react-day-picker/locale"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { ActivityCombobox } from "@/components/CatalogCombobox/ActivityCombobox"
import { LocalityCombobox } from "@/components/CatalogCombobox/LocalityCombobox"
import {
  imageChangeOf,
  ImageField,
  initialImageValue,
  type ImageFieldValue,
} from "@/components/ImageField/ImageField"
import { LocationPicker } from "@/components/map/LocationPicker"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useRevealFormErrors,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import type { Catalog } from "@/lib/catalog/catalogSearch"
import { PRAHA_SLUG } from "@/lib/catalog/localityOptions"
import type { ImageChange } from "@/lib/image"
import { cn } from "@/lib/utils"

import { distanceKm } from "@/features/events/api/addressSearch"
import {
  EVENT_ADDRESS_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_MAX_PARTICIPANTS,
  EVENT_TITLE_MAX_LENGTH,
  type EventInput,
} from "@/features/events/api/eventSchemas"
import { AddressCombobox } from "@/features/events/components/AddressCombobox"
import { useEventLocation } from "@/features/events/hooks/useEventLocation"
import { usePragueToday } from "@/features/events/hooks/usePragueToday"
import { CLOCK_TIME_ERROR, normalizeClockTime } from "@/features/events/lib/clockTime"
import { dateToDay, dayToDate } from "@/features/events/lib/dateRange"
import { formatDay } from "@/features/events/lib/formatEvent"
import { eventTimes, toPragueWallTime } from "@/features/events/lib/pragueTime"

const count = (name: string) =>
  z
    .string()
    .trim()
    .min(1, `Vyplň ${name}`)
    .regex(/^\d+$/, "Zadej celé číslo")
    .refine(
      (value) => Number(value) >= 1,
      `${name[0]!.toUpperCase()}${name.slice(1)} musí být aspoň 1`,
    )
    .refine((value) => Number(value) <= EVENT_MAX_PARTICIPANTS, `Nejvýš ${EVENT_MAX_PARTICIPANTS}`)

/** Keep raw text while editing; normalize both fields before comparing times
 * or converting to Prague instants, including a submit without a blur (#200). */
const clockTime = (requiredMessage?: string) =>
  z
    .string()
    .trim()
    .superRefine((value, context) => {
      if (!value) {
        if (requiredMessage) context.addIssue({ code: "custom", message: requiredMessage })
      } else if (normalizeClockTime(value) === null) {
        context.addIssue({ code: "custom", message: CLOCK_TIME_ERROR })
      }
    })
    .transform((value) => normalizeClockTime(value) ?? "")

/** `approvedCount`: when editing, the maximum can't go below the people already in (#41). */
const buildSchema = (approvedCount: number) =>
  z
    .object({
      title: z
        .string()
        .trim()
        .min(1, "Vyplň název akce")
        .max(EVENT_TITLE_MAX_LENGTH, `Název může mít nejvýš ${EVENT_TITLE_MAX_LENGTH} znaků`),
      activityId: z.string().min(1, "Akce potřebuje aktivitu"),
      localityId: z.string().min(1, "Akce potřebuje lokalitu"),
      place: z.object({ lat: z.number(), lng: z.number() }).nullable(),
      address: z
        .string()
        .trim()
        .min(1, "Vyplň adresu")
        .max(EVENT_ADDRESS_MAX_LENGTH, `Adresa může mít nejvýš ${EVENT_ADDRESS_MAX_LENGTH} znaků`),
      /** A Prague day, `YYYY-MM-DD`. */
      day: z.string().min(1, "Akce potřebuje datum"),
      /** A typed 24-hour time, normalized to `HH:mm`, Prague time. */
      start: clockTime("Vyplň začátek"),
      /** Optional; earlier than the start means the next day. */
      end: clockTime(),
      minParticipants: count("minimum"),
      /** Optional (PO 26. 11.): empty means no maximum. */
      maxParticipants: z.union([z.literal(""), count("maximum")]),
      approvalMode: z.enum(["open", "approval"]),
      /** #86: an e-mail for each sign-up; only for an open event. */
      emailOnJoin: z.boolean(),
      visibility: z.enum(["public", "members"]),
      description: z
        .string()
        .trim()
        .max(
          EVENT_DESCRIPTION_MAX_LENGTH,
          `Popis může mít nejvýš ${EVENT_DESCRIPTION_MAX_LENGTH} znaků`,
        ),
      /** The event's own image (#77); a refused file never gets here (`onRefuse`). */
      image: z.custom<ImageFieldValue>(),
    })
    .refine((values) => values.place !== null, {
      message: "Vyber místo na mapě",
      path: ["place"],
    })
    .refine(
      (values) =>
        !values.day ||
        normalizeClockTime(values.start) === null ||
        eventTimes(values.day, values.start, "").startsAt > new Date(),
      { message: "Termín musí být v budoucnosti", path: ["start"] },
    )
    .refine(
      (values) =>
        !values.end ||
        normalizeClockTime(values.end) === null ||
        normalizeClockTime(values.start) === null ||
        values.end !== values.start,
      {
        message: "Konec musí být jiný než začátek",
        path: ["end"],
      },
    )
    .refine(
      (values) =>
        values.maxParticipants === "" ||
        Number(values.maxParticipants) >= Number(values.minParticipants),
      {
        message: "Maximum nesmí být menší než minimum",
        path: ["maxParticipants"],
      },
    )
    .refine(
      (values) => values.maxParticipants === "" || Number(values.maxParticipants) >= approvedCount,
      {
        message: `Maximum nejde snížit pod počet přihlášených (${approvedCount})`,
        path: ["maxParticipants"],
      },
    )

type FormValues = z.input<ReturnType<typeof buildSchema>>

type RadioCardOption<T extends string> = { value: T; title: string; hint: string }

/** Figma D-01: Radio card; „Bez schválení“ is the default (PO 19. 10.) */
const APPROVAL_OPTIONS: RadioCardOption<EventInput["approvalMode"]>[] = [
  {
    value: "open",
    title: "Bez schválení",
    hint: "Kdo se přihlásí, je rovnou na akci. Výchozí volba.",
  },
  {
    value: "approval",
    title: "Schvaluji přihlášky",
    hint: "Každou žádost schválíš nebo zamítneš ve správě akce.",
  },
]

/** Figma D-01g: who sees a group's event (B-055); „Veřejná“ is the default. */
const VISIBILITY_OPTIONS: RadioCardOption<NonNullable<EventInput["visibility"]>>[] = [
  {
    value: "public",
    title: "Veřejná",
    hint: "Najde ji a přihlásí se kdokoli.",
  },
  {
    value: "members",
    title: "Jen pro členy skupiny",
    hint: "Uvidí ji a přihlásí se jen členové. V hledání, na mapě ani na úvodní stránce se neukáže.",
  },
]

/** `YYYY-MM-DDTHH:mm` Prague wall time of an ISO instant, as the day and the time. */
const splitWallTime = (iso: string | null | undefined): [string, string] => {
  if (!iso) return ["", ""]
  const [day = "", time = ""] = toPragueWallTime(new Date(iso)).split("T")
  return [day, time]
}

// Mobile keeps the field order of D-01 (name, activity, where, when…); on
// desktop the two columns of D-01d sit side by side: „Co a kdy“ | „Kde“.
// The columns are `contents` on mobile, so `order` places their fields.
const COLUMN = "contents md:flex md:flex-col md:gap-5"
const COLUMN_HEADING = "hidden text-lg font-semibold tracking-tight md:block"

type EventFormProps = {
  catalog: Catalog
  /**
   * `edit` (#41): the same form, but the activity and the way of joining stay
   * as they are (design decision for D-02), and the maximum can't go below
   * `approvedCount`.
   */
  mode?: "create" | "edit"
  approvedCount?: number
  /**
   * A group's event (B-055, Figma D-01g): „Pořádá“ names the group, the
   * activity is the group's and locked, and the admin picks who sees it.
   */
  group?: { id: string; name: string }
  /**
   * The page shows „Pořádá: Já / skupina“ above the form (#438): the form's own „Pořádá“ row
   * would say it twice (review #439).
   */
  hasOrganizerChoice?: boolean
  /** Prefilled values, e.g. when editing (#41). */
  initialValues?: Partial<EventInput>
  /** The image the event already has (#77), when editing. */
  initialImageSrc?: string | null
  isSubmitting: boolean
  errorMessage?: string | null
  /** `image`: what to do with the event's own image after saving it (#77). */
  onSubmit: (input: EventInput, image: ImageChange) => void | Promise<void>
}

/**
 * Figma D-01, D-01d: a new event (B-022), D-01g, D-01gd a new event of a
 * group (B-055), and D-02, D-02d editing it (#41). The organizer is the
 * signed-in user.
 */
export function EventForm({
  catalog,
  mode = "create",
  approvedCount = 0,
  group,
  hasOrganizerChoice = false,
  initialValues,
  initialImageSrc,
  isSubmitting,
  errorMessage,
  onSubmit,
}: EventFormProps) {
  const placeLabelId = useId()
  const placeErrorId = useId()
  const approvalId = useId()
  const visibilityId = useId()
  const countLabelId = useId()
  const whatId = useId()
  const whereId = useId()
  const imageLabelId = useId()
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const today = usePragueToday()
  const isEdit = mode === "edit"
  const isGroupCreate = !isEdit && group !== undefined
  // the e-mail for each sign-up is the organizer's (#86): an edit by another admin has none
  const canSetEmailOnJoin = !isEdit || initialValues?.emailOnJoin !== undefined
  const schema = useMemo(() => buildSchema(approvedCount), [approvedCount])
  const [initialDay, initialStart] = splitWallTime(initialValues?.startsAt)
  const [, initialEnd] = splitWallTime(initialValues?.endsAt)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    // useRevealFormErrors focuses instead, after scrolling its own way (#291)
    shouldFocusError: false,
    defaultValues: {
      title: initialValues?.title ?? "",
      activityId: initialValues?.activityId ?? "",
      localityId: initialValues?.localityId ?? "",
      place:
        initialValues?.lat !== undefined && initialValues.lng !== undefined
          ? { lat: initialValues.lat, lng: initialValues.lng }
          : null,
      address: initialValues?.address ?? "",
      day: initialDay,
      start: initialStart,
      end: initialEnd,
      minParticipants: initialValues?.minParticipants?.toString() ?? "",
      maxParticipants: initialValues?.maxParticipants?.toString() ?? "",
      approvalMode: initialValues?.approvalMode ?? "open",
      emailOnJoin: initialValues?.emailOnJoin ?? false,
      visibility: initialValues?.visibility ?? "public",
      description: initialValues?.description ?? "",
      image: initialImageValue(initialImageSrc),
    },
  })

  const formRef = useRevealFormErrors(form, errorMessage)

  const finishTime = (name: "start" | "end") => {
    const raw = form.getValues(name)
    const normalized = normalizeClockTime(raw)
    if (normalized !== null || !raw.trim()) {
      form.setValue(name, normalized ?? "", { shouldDirty: true })
    }
    // A changed start can resolve the equality error of an already touched end.
    const end = form.getFieldState("end")
    void form.trigger(name === "start" && (end.isTouched || end.invalid) ? ["start", "end"] : name)
  }

  const localityId = useWatch({ control: form.control, name: "localityId" })
  const place = useWatch({ control: form.control, name: "place" })
  const [didChangeLocality, setDidChangeLocality] = useState(false)
  const [isPickingLocality, setIsPickingLocality] = useState(false)
  const selectedLocality = catalog.localities.find((l) => l.id === localityId)
  const mapCenter = selectedLocality ??
    // before a locality is picked: the biggest city, as the picker lists it first
    catalog.localities.find((l) => l.slug === PRAHA_SLUG) ??
    catalog.localities[0] ?? { lat: 50.0755, lng: 14.4378 }
  // The catalog has locality centers, so this is only a distance hint.
  const suggestedCenter =
    didChangeLocality && place && selectedLocality && distanceKm(place, selectedLocality) > 2
      ? selectedLocality
      : null

  const location = useEventLocation({
    localities: catalog.localities,
    initialAddress: initialValues?.address ?? "",
    getValues: () => form.getValues(),
    setAddress: (value) =>
      form.setValue("address", value, {
        shouldDirty: true,
        shouldValidate: form.formState.isSubmitted,
      }),
    setPlace: (value) =>
      form.setValue("place", value, {
        shouldDirty: true,
        shouldValidate: form.formState.isSubmitted,
      }),
    setLocality: (value) =>
      form.setValue("localityId", value, {
        shouldDirty: true,
        shouldValidate: form.formState.isSubmitted,
      }),
  })

  return (
    <Form {...form}>
      <form
        ref={formRef}
        noValidate
        onSubmit={form.handleSubmit((values) => {
          // entered as Prague time, whatever the device's time zone
          const { startsAt, endsAt } = eventTimes(values.day, values.start, values.end)
          const image = imageChangeOf(values.image, Boolean(initialImageSrc))
          return onSubmit(
            {
              title: values.title.trim(),
              description: values.description.trim() || null,
              activityId: values.activityId,
              localityId: values.localityId,
              lat: values.place!.lat,
              lng: values.place!.lng,
              address: values.address.trim(),
              startsAt: startsAt.toISOString(),
              endsAt: endsAt?.toISOString() ?? null,
              minParticipants: Number(values.minParticipants),
              // empty: no maximum; null also removes one when editing
              maxParticipants:
                values.maxParticipants === "" ? null : Number(values.maxParticipants),
              approvalMode: values.approvalMode,
              // an event with approval e-mails every request anyway (#177)
              ...(canSetEmailOnJoin
                ? { emailOnJoin: values.approvalMode === "open" && values.emailOnJoin }
                : {}),
              ...(isGroupCreate ? { groupId: group.id, visibility: values.visibility } : {}),
            },
            image,
          )
        })}
        className="flex flex-col gap-6"
      >
        {group && !hasOrganizerChoice ? (
          // Figma D-01g: „Pořádá“ — the group is the organizer shown at the event
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-tile-border bg-secondary text-secondary-foreground">
              <Users
                className="size-5"
                aria-hidden
              />
            </span>
            <p className="flex flex-col">
              <span className="text-xs text-muted-foreground">Pořádá</span>
              <span className="text-base">{group.name} (skupina)</span>
            </p>
          </div>
        ) : null}

        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:items-start md:gap-12">
          <div
            role="group"
            aria-labelledby={whatId}
            className={COLUMN}
          >
            <h2
              id={whatId}
              className={COLUMN_HEADING}
            >
              Co a kdy
            </h2>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="order-1 md:order-none">
                  <FormLabel>Název akce *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="např. Deskovky po práci v Karlíně"
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
                      disabled={isEdit || group !== undefined}
                    />
                  </FormControl>
                  {isEdit || group ? (
                    <p className="text-sm text-muted-foreground">
                      {isEdit
                        ? "Aktivitu po založení změnit nejde."
                        : "Aktivita je podle skupiny a změnit nejde."}
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="day"
              render={({ field }) => (
                <FormItem className="order-6 md:order-none">
                  <FormLabel>Datum *</FormLabel>
                  <Popover
                    open={isCalendarOpen}
                    onOpenChange={setIsCalendarOpen}
                  >
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          ref={field.ref}
                          type="button"
                          variant="outline"
                          onBlur={field.onBlur}
                          className={cn(
                            "h-11 w-full justify-between bg-card px-3 text-base font-normal md:text-sm",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value ? formatDay(field.value) : "Vyber datum"}
                          <ChevronDown className="text-muted-foreground" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-auto"
                    >
                      <Calendar
                        mode="single"
                        locale={cs}
                        weekStartsOn={1}
                        showOutsideDays={false}
                        defaultMonth={dayToDate(field.value || today)}
                        disabled={{ before: dayToDate(today) }}
                        selected={field.value ? dayToDate(field.value) : undefined}
                        onSelect={(date) => {
                          field.onChange(date ? dateToDay(date) : "")
                          setIsCalendarOpen(false)
                        }}
                        className="p-0"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="order-7 grid grid-cols-2 items-start gap-3 md:order-none">
              <FormField
                control={form.control}
                name="start"
                render={({ field }) => {
                  const normalized = normalizeClockTime(field.value)
                  return (
                    <FormItem>
                      <FormLabel>Začátek *</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          spellCheck={false}
                          placeholder="např. 9:00"
                          className="h-11"
                          {...field}
                          onBlur={() => {
                            field.onBlur()
                            finishTime("start")
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Čas napiš jako 9:00 nebo 0900.
                        <span
                          role="status"
                          className="block"
                        >
                          {normalized && normalized < "05:00"
                            ? "Začátek je mezi půlnocí a pátou ráno. Zkontroluj, jestli je čas správný."
                            : ""}
                        </span>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
              <FormField
                control={form.control}
                name="end"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Konec</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="např. 18:30"
                        className="h-11"
                        {...field}
                        onBlur={() => {
                          field.onBlur()
                          finishTime("end")
                        }}
                      />
                    </FormControl>
                    <FormDescription>Nepovinné</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div
              role="group"
              aria-labelledby={countLabelId}
              className="order-8 flex flex-col gap-2 md:order-none"
            >
              <p
                id={countLabelId}
                className="text-sm leading-none font-medium"
              >
                Počet účastníků *
              </p>
              <div className="grid grid-cols-2 items-start gap-3">
                <FormField
                  control={form.control}
                  name="minParticipants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={EVENT_MAX_PARTICIPANTS}
                          placeholder="např. 4"
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
                  name="maxParticipants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={EVENT_MAX_PARTICIPANTS}
                          placeholder="bez omezení"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {isEdit
                  ? `Maximum nejde snížit pod počet přihlášených (${approvedCount}). Bez maxima se může přihlásit kdokoli.`
                  : "U akce se ukáže „Chybí ještě X“. Maximum je nepovinné: po jeho naplnění se přihlašování zavře, bez něj se může přihlásit kdokoli. Organizátor se do počtu počítá, jen když se na akci sám přihlásí."}
              </p>
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="order-9 md:order-none">
                  <FormLabel>Popis</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="např. Hrajeme středně těžké hry, hry půjčíme."
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  {/* level, price and gear aren't fields yet: the description answers
                      „is it for me?“ */}
                  <FormDescription>
                    Napiš, pro koho akce je, jaká úroveň stačí, kolik stojí a co si vzít s sebou.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="approvalMode"
              render={({ field }) => (
                <FormItem className="order-10 md:order-none">
                  <FormLabel id={`${approvalId}-label`}>Způsob přihlašování *</FormLabel>
                  <FormControl>
                    <RadioCards
                      id={approvalId}
                      ref={field.ref}
                      options={APPROVAL_OPTIONS}
                      value={field.value}
                      onValueChange={field.onChange}
                      isDisabled={isEdit}
                    />
                  </FormControl>
                  {!canSetEmailOnJoin ? null : field.value === "open" ? (
                    // Figma D-01e, D-02e (#86): after the cards, not between them — a checkbox
                    // inside the radiogroup would break its arrow keys and its ARIA children
                    <FormField
                      control={form.control}
                      name="emailOnJoin"
                      render={({ field: emailField }) => (
                        <FormItem className="grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 pt-1 pl-4">
                          <FormControl>
                            <Checkbox
                              ref={emailField.ref}
                              name={emailField.name}
                              checked={emailField.value}
                              onCheckedChange={(checked) => emailField.onChange(checked === true)}
                              onBlur={emailField.onBlur}
                            />
                          </FormControl>
                          <FormLabel className="block leading-normal">
                            Posílat mi e-mail ke každé přihlášce
                          </FormLabel>
                          <FormDescription className="col-start-2">
                            Upozornění v aplikaci dostaneš vždy.
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Každá žádost ti přijde do upozornění i e-mailem.
                    </p>
                  )}
                  {isEdit ? (
                    <p className="text-sm text-muted-foreground">
                      Způsob přihlašování po založení změnit nejde.
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            {isGroupCreate ? (
              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem className="order-11 md:order-none">
                    <FormLabel id={`${visibilityId}-label`}>Kdo akci uvidí *</FormLabel>
                    <FormControl>
                      <RadioCards
                        id={visibilityId}
                        ref={field.ref}
                        options={VISIBILITY_OPTIONS}
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                // Figma D-01: the last field of „Co a kdy“
                <FormItem className="order-12 md:order-none">
                  <FormLabel id={imageLabelId}>Plakát nebo fotka</FormLabel>
                  <FormControl>
                    <ImageField
                      ref={field.ref}
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value)
                        form.clearErrors("image")
                      }}
                      onRefuse={(message) => form.setError("image", { message })}
                      addLabel="Přidat plakát nebo fotku"
                      labelId={imageLabelId}
                    />
                  </FormControl>
                  <FormDescription>
                    Nepovinné. JPEG, PNG nebo WebP, nejvýš 5 MB. Bez vlastního obrázku se u akce
                    ukáže fotka aktivity.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div
            role="group"
            aria-labelledby={whereId}
            className={COLUMN}
          >
            <h2
              id={whereId}
              className={COLUMN_HEADING}
            >
              Kde
            </h2>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="order-3 md:order-none">
                  <FormLabel>Adresa *</FormLabel>
                  <FormControl>
                    <AddressCombobox
                      placeholder="např. Herna Karlín, Křižíkova 52, Praha 8"
                      autoComplete="off"
                      className="h-11"
                      {...field}
                      onChange={(value) => {
                        location.typeAddress(value)
                      }}
                      near={place ?? mapCenter}
                      onPick={(suggestion) => {
                        setDidChangeLocality(false)
                        location.pickAddress(suggestion)
                      }}
                    />
                  </FormControl>
                  <FormDescription role="status">{location.notice}</FormDescription>
                  {location.pendingAddress ? (
                    <div
                      className="flex flex-col gap-2 border-l border-border pl-3"
                      role="group"
                      aria-label="Změna adresy podle špendlíku"
                    >
                      <p className="text-sm font-medium">Použít adresu podle špendlíku?</p>
                      <p className="text-sm text-muted-foreground">{location.pendingAddress}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={location.acceptAddress}
                        >
                          Použít adresu
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={location.keepAddress}
                        >
                          Ponechat moji
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="place"
              render={({ field, fieldState }) => (
                <FormItem className="order-4 md:order-none">
                  {/* the map isn't a form control, so a heading names it, not a <label> */}
                  <p
                    id={placeLabelId}
                    className="text-sm leading-none font-medium"
                  >
                    Místo na mapě *
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Klepni do mapy tam, kde se sejdete. Nebo mapu posuň a umísti špendlík na křížek
                    uprostřed.
                  </p>
                  <LocationPicker
                    value={field.value}
                    onChange={(point, source) => {
                      setDidChangeLocality(false)
                      void location.pickPoint(point, source === "center")
                    }}
                    center={mapCenter}
                    labelledBy={placeLabelId}
                    isInvalid={Boolean(fieldState.error)}
                    describedBy={fieldState.error ? placeErrorId : undefined}
                    // D-01d: the map has the room of its own column on desktop
                    mapClassName="md:h-100"
                  />
                  {suggestedCenter ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className="text-sm text-muted-foreground"
                        role="status"
                      >
                        Špendlík je dál od středu lokality {suggestedCenter.name}.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDidChangeLocality(false)
                          void location.pickPoint(suggestedCenter)
                        }}
                      >
                        Přesunout do středu lokality
                      </Button>
                    </div>
                  ) : null}
                  <FormMessage id={placeErrorId} />
                </FormItem>
              )}
            />

            {/* PO 26. 11. (#303): the address is entered once and the locality follows from it
                (and from the pin); picking it by hand is the way out when it can't be found —
                the field shows only then, or after „Změnit“ / „Vybrat ručně“ */}
            <FormField
              control={form.control}
              name="localityId"
              render={({ field }) =>
                selectedLocality && !isPickingLocality ? (
                  <FormItem className="order-5 md:order-none">
                    <p className="flex flex-wrap items-center gap-x-2 text-sm">
                      <span className="text-muted-foreground">Lokalita pro vyhledávání:</span>
                      <span className="font-semibold">{selectedLocality.name}</span>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-10 px-1"
                        aria-label={`Změnit lokalitu ${selectedLocality.name}`}
                        onClick={() => setIsPickingLocality(true)}
                      >
                        Změnit
                      </Button>
                    </p>
                    <FormDescription>Doplní se podle adresy a místa na mapě.</FormDescription>
                  </FormItem>
                ) : !place && !isPickingLocality ? (
                  // no address or pin yet: one line, not a second field to fill in before the
                  // address (review #417, PO 26. 11.: „lokalitu brát automaticky z adresy“)
                  <FormItem className="order-5 md:order-none">
                    <p className="flex flex-wrap items-center gap-x-2 text-sm">
                      <span className="text-muted-foreground">
                        Lokalita pro vyhledávání se doplní podle adresy.
                      </span>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-10 px-1"
                        onClick={() => setIsPickingLocality(true)}
                      >
                        Vybrat ručně
                      </Button>
                    </p>
                    <FormMessage />
                  </FormItem>
                ) : (
                  <FormItem className="order-5 md:order-none">
                    <FormLabel>Lokalita *</FormLabel>
                    <FormControl>
                      <LocalityCombobox
                        localities={catalog.localities}
                        ref={field.ref}
                        value={field.value}
                        onChange={(value) => {
                          location.cancelLookup()
                          setDidChangeLocality(true)
                          field.onChange(value)
                        }}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    <FormDescription>
                      Obec nebo městská část, podle které se dá akce najít. Doplní se sama podle
                      adresy, tady ji můžeš změnit.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )
              }
            />
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          // D-01d: as wide as its label on desktop
          className="h-11 w-full md:w-auto md:self-start"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {isEdit ? "Uložit změny" : "Zveřejnit akci"}
        </Button>
      </form>
    </Form>
  )
}

type RadioCardsProps<T extends string> = {
  /** The `useId` of the field: its label is `${id}-label`, each card `${id}-${value}`. */
  id: string
  ref: Ref<HTMLDivElement>
  options: RadioCardOption<T>[]
  value: T
  onValueChange: (value: T) => void
  isDisabled?: boolean
}

/** Figma D-01: Radio card — a radio group whose options are cards with a hint. */
function RadioCards<T extends string>({
  id,
  ref,
  options,
  value,
  onValueChange,
  isDisabled,
}: RadioCardsProps<T>) {
  return (
    <RadioGroup
      // a <label for> can't name a radiogroup; this does
      aria-labelledby={`${id}-label`}
      ref={ref}
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      disabled={isDisabled}
      className="gap-2"
    >
      {options.map((option) => (
        <label
          key={option.value}
          htmlFor={`${id}-${option.value}`}
          className={cn(
            "flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors",
            isDisabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-accent",
            value === option.value && "border-foreground",
          )}
        >
          <RadioGroupItem
            id={`${id}-${option.value}`}
            value={option.value}
          />
          <span className="flex flex-col">
            <span className="text-sm font-semibold">{option.title}</span>
            <span className="text-sm text-muted-foreground">{option.hint}</span>
          </span>
        </label>
      ))}
    </RadioGroup>
  )
}
