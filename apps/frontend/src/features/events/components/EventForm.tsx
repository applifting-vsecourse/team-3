import { useId, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronDown, Loader2 } from "lucide-react"
import { cs } from "react-day-picker/locale"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { LocationPicker } from "@/components/map/LocationPicker"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Catalog } from "@/lib/catalog/catalogSearch"
import { DEFAULT_LOCALITY_SLUG, localityOptions } from "@/lib/catalog/localityOptions"
import { cn } from "@/lib/utils"

import { localityOfAddress } from "@/features/events/api/addressSearch"
import {
  EVENT_ADDRESS_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_MAX_PARTICIPANTS,
  EVENT_TITLE_MAX_LENGTH,
  type EventInput,
} from "@/features/events/api/eventSchemas"
import { AddressCombobox } from "@/features/events/components/AddressCombobox"
import { dateToDay, dayToDate, pragueToday } from "@/features/events/lib/dateRange"
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
      /** `HH:mm`, Prague time. */
      start: z.string().min(1, "Vyplň začátek"),
      /** Optional; earlier than the start means the next day. */
      end: z.string(),
      minParticipants: count("minimum"),
      maxParticipants: count("maximum"),
      approvalMode: z.enum(["open", "approval"]),
      description: z
        .string()
        .trim()
        .max(
          EVENT_DESCRIPTION_MAX_LENGTH,
          `Popis může mít nejvýš ${EVENT_DESCRIPTION_MAX_LENGTH} znaků`,
        ),
    })
    .refine((values) => values.place !== null, {
      message: "Vyber místo na mapě",
      path: ["place"],
    })
    .refine(
      (values) =>
        !values.day ||
        !values.start ||
        eventTimes(values.day, values.start, "").startsAt > new Date(),
      { message: "Termín musí být v budoucnosti", path: ["start"] },
    )
    .refine((values) => !values.end || values.end !== values.start, {
      message: "Konec musí být jiný než začátek",
      path: ["end"],
    })
    .refine((values) => Number(values.maxParticipants) >= Number(values.minParticipants), {
      message: "Maximum nesmí být menší než minimum",
      path: ["maxParticipants"],
    })
    .refine((values) => Number(values.maxParticipants) >= approvedCount, {
      message: `Maximum nejde snížit pod počet přihlášených (${approvedCount})`,
      path: ["maxParticipants"],
    })

type FormValues = z.input<ReturnType<typeof buildSchema>>

/** Figma D-01: Radio card; „Bez schválení“ is the default (PO 19. 10.) */
const APPROVAL_OPTIONS: { value: EventInput["approvalMode"]; title: string; hint: string }[] = [
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
  /** Prefilled values, e.g. when editing (#41). */
  initialValues?: Partial<EventInput>
  isSubmitting: boolean
  errorMessage?: string | null
  onSubmit: (input: EventInput) => void | Promise<void>
}

/** Figma D-01, D-01d: a new event (B-022), and D-02, D-02d editing it (#41). The organizer is the signed-in user. */
export function EventForm({
  catalog,
  mode = "create",
  approvedCount = 0,
  initialValues,
  isSubmitting,
  errorMessage,
  onSubmit,
}: EventFormProps) {
  const placeLabelId = useId()
  const placeErrorId = useId()
  const approvalId = useId()
  const countLabelId = useId()
  const whatId = useId()
  const whereId = useId()
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [today] = useState(() => pragueToday())
  const isEdit = mode === "edit"
  const schema = useMemo(() => buildSchema(approvedCount), [approvedCount])
  const [initialDay, initialStart] = splitWallTime(initialValues?.startsAt)
  const [, initialEnd] = splitWallTime(initialValues?.endsAt)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
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
      description: initialValues?.description ?? "",
    },
  })

  const localityId = useWatch({ control: form.control, name: "localityId" })
  const place = useWatch({ control: form.control, name: "place" })
  const mapCenter = catalog.localities.find((l) => l.id === localityId) ??
    catalog.localities.find((l) => l.slug === DEFAULT_LOCALITY_SLUG) ??
    catalog.localities[0] ?? { lat: 50.0755, lng: 14.4378 }

  const activityLabel = (id: string) => {
    for (const category of catalog.categories) {
      const activity = category.activities.find((a) => a.id === id)
      if (activity) return `${category.name} › ${activity.name}`
    }
    return undefined
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => {
          // entered as Prague time, whatever the device's time zone
          const { startsAt, endsAt } = eventTimes(values.day, values.start, values.end)
          return onSubmit({
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
            maxParticipants: Number(values.maxParticipants),
            approvalMode: values.approvalMode,
          })
        })}
        className="flex flex-col gap-6"
      >
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
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isEdit}
                  >
                    <FormControl>
                      <SelectTrigger
                        ref={field.ref}
                        onBlur={field.onBlur}
                        className="w-full text-base data-[size=default]:h-11 md:text-sm"
                      >
                        <SelectValue placeholder="Vyber aktivitu">
                          {field.value ? activityLabel(field.value) : undefined}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent
                      position="popper"
                      className="max-h-80"
                    >
                      {catalog.categories.map((category) => (
                        <SelectGroup key={category.id}>
                          <SelectLabel>{category.name}</SelectLabel>
                          {category.activities.map((activity) => (
                            <SelectItem
                              key={activity.id}
                              value={activity.id}
                            >
                              {activity.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  {isEdit ? (
                    <p className="text-sm text-muted-foreground">
                      Aktivitu po založení změnit nejde.
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
                            "h-11 w-full justify-between px-3 text-base font-normal md:text-sm",
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Začátek *</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
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
                name="end"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Konec</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        className="h-11"
                        {...field}
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
                          placeholder="např. 8"
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
                  ? `Maximum nejde snížit pod počet přihlášených (${approvedCount}).`
                  : "U akce se ukáže „Chybí ještě X“. Po naplnění maxima se přihlašování zavře. Organizátor se do počtu počítá, jen když se na akci sám přihlásí."}
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
                    <RadioGroup
                      // a <label for> can't name a radiogroup; this does
                      aria-labelledby={`${approvalId}-label`}
                      ref={field.ref}
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isEdit}
                      className="gap-2"
                    >
                      {APPROVAL_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          htmlFor={`${approvalId}-${option.value}`}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-accent",
                            field.value === option.value && "border-foreground",
                          )}
                        >
                          <RadioGroupItem
                            id={`${approvalId}-${option.value}`}
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
                  {isEdit ? (
                    <p className="text-sm text-muted-foreground">
                      Způsob přihlašování po založení změnit nejde.
                    </p>
                  ) : null}
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
              name="localityId"
              render={({ field }) => (
                <FormItem className="order-3 md:order-none">
                  <FormLabel>Lokalita *</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger
                        ref={field.ref}
                        onBlur={field.onBlur}
                        className="w-full text-base data-[size=default]:h-11 md:text-sm"
                      >
                        <SelectValue placeholder="Vyber lokalitu" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent
                      position="popper"
                      className="max-h-80"
                    >
                      {localityOptions(catalog.localities).map((locality) => (
                        <SelectItem
                          key={locality.id}
                          value={locality.id}
                          className={cn(locality.isDistrict && "pl-6")}
                        >
                          {locality.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    Klepni do mapy tam, kde se sejdete.
                  </p>
                  <LocationPicker
                    value={field.value}
                    onChange={(point) => field.onChange(point)}
                    center={mapCenter}
                    labelledBy={placeLabelId}
                    isInvalid={Boolean(fieldState.error)}
                    describedBy={fieldState.error ? placeErrorId : undefined}
                    // D-01d: the map has the room of its own column on desktop
                    mapClassName="md:h-100"
                  />
                  <FormMessage id={placeErrorId} />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="order-5 md:order-none">
                  <FormLabel>Adresa *</FormLabel>
                  <FormControl>
                    <AddressCombobox
                      placeholder="např. Herna Karlín, Křižíkova 52, Praha 8"
                      autoComplete="off"
                      className="h-11"
                      {...field}
                      near={place ?? mapCenter}
                      // a picked address also moves the pin, and sets the locality
                      // when the catalog has a more precise one for it
                      onPick={(suggestion) => {
                        const options = {
                          shouldDirty: true,
                          shouldValidate: form.formState.isSubmitted,
                        }
                        field.onChange(suggestion.address)
                        form.setValue(
                          "place",
                          { lat: suggestion.lat, lng: suggestion.lng },
                          options,
                        )
                        const locality = localityOfAddress(
                          suggestion,
                          catalog.localities,
                          form.getValues("localityId"),
                        )
                        if (locality) form.setValue("localityId", locality.id, options)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
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
