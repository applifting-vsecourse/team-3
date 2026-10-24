import { useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { LocationPicker } from "@/components/map/LocationPicker"
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

import {
  EVENT_ADDRESS_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_MAX_PARTICIPANTS,
  EVENT_TITLE_MAX_LENGTH,
  type EventInput,
} from "@/features/events/api/eventSchemas"
import { fromPragueWallTime, toPragueWallTime } from "@/features/events/lib/pragueTime"

const count = (name: string) =>
  z
    .string()
    .trim()
    .min(1, `Vyplňte ${name}`)
    .regex(/^\d+$/, "Zadejte celé číslo")
    .refine(
      (value) => Number(value) >= 1,
      `${name[0]!.toUpperCase()}${name.slice(1)} musí být aspoň 1`,
    )
    .refine((value) => Number(value) <= EVENT_MAX_PARTICIPANTS, `Nejvýš ${EVENT_MAX_PARTICIPANTS}`)

const schema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Vyplňte název akce")
      .max(EVENT_TITLE_MAX_LENGTH, `Název může mít nejvýš ${EVENT_TITLE_MAX_LENGTH} znaků`),
    activityId: z.string().min(1, "Akce potřebuje aktivitu"),
    localityId: z.string().min(1, "Akce potřebuje lokalitu"),
    place: z.object({ lat: z.number(), lng: z.number() }).nullable(),
    address: z
      .string()
      .trim()
      .min(1, "Vyplňte adresu")
      .max(EVENT_ADDRESS_MAX_LENGTH, `Adresa může mít nejvýš ${EVENT_ADDRESS_MAX_LENGTH} znaků`),
    startsAt: z
      .string()
      .min(1, "Vyplňte datum a čas")
      .refine((value) => fromPragueWallTime(value) > new Date(), "Termín musí být v budoucnosti"),
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
    message: "Vyberte místo na mapě",
    path: ["place"],
  })
  .refine((values) => Number(values.maxParticipants) >= Number(values.minParticipants), {
    message: "Maximum nesmí být menší než minimum",
    path: ["maxParticipants"],
  })

type FormValues = z.input<typeof schema>

/** Figma D-01: Radio card; „Bez schválení“ is the default (PO 19. 10.) */
const APPROVAL_OPTIONS: { value: EventInput["approvalMode"]; title: string; hint: string }[] = [
  { value: "open", title: "Bez schválení", hint: "Kdo se přihlásí, má místo hned." },
  {
    value: "approval",
    title: "Schvaluji přihlášky",
    hint: "Lidé posílají žádost, kterou schválíte nebo zamítnete.",
  },
]

type EventFormProps = {
  catalog: Catalog
  /** Prefilled values, e.g. when editing (#41). */
  initialValues?: Partial<EventInput>
  isSubmitting: boolean
  errorMessage?: string | null
  onSubmit: (input: EventInput) => void | Promise<void>
}

/** Figma D-01: a new event (B-022). The organizer is the signed-in user. */
export function EventForm({
  catalog,
  initialValues,
  isSubmitting,
  errorMessage,
  onSubmit,
}: EventFormProps) {
  const placeLabelId = useId()
  const placeErrorId = useId()
  const approvalId = useId()
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
      startsAt: initialValues?.startsAt ? toPragueWallTime(new Date(initialValues.startsAt)) : "",
      minParticipants: initialValues?.minParticipants?.toString() ?? "",
      maxParticipants: initialValues?.maxParticipants?.toString() ?? "",
      approvalMode: initialValues?.approvalMode ?? "open",
      description: initialValues?.description ?? "",
    },
  })

  const localityId = useWatch({ control: form.control, name: "localityId" })
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
        onSubmit={form.handleSubmit((values) =>
          onSubmit({
            title: values.title.trim(),
            description: values.description.trim() || null,
            activityId: values.activityId,
            localityId: values.localityId,
            lat: values.place!.lat,
            lng: values.place!.lng,
            address: values.address.trim(),
            // entered as Prague time, whatever the device's time zone
            startsAt: fromPragueWallTime(values.startsAt).toISOString(),
            minParticipants: Number(values.minParticipants),
            maxParticipants: Number(values.maxParticipants),
            approvalMode: values.approvalMode,
          }),
        )}
        className="flex flex-col gap-6"
      >
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
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
            <FormItem>
              <FormLabel>Aktivita *</FormLabel>
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
                    <SelectValue placeholder="Vyberte aktivitu">
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
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="localityId"
          render={({ field }) => (
            <FormItem>
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
                    <SelectValue placeholder="Vyberte lokalitu" />
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
            <FormItem>
              {/* the map isn't a form control, so a heading names it, not a <label> */}
              <p
                id={placeLabelId}
                className="text-sm leading-none font-medium"
              >
                Místo na mapě *
              </p>
              <p className="text-sm text-muted-foreground">Klepněte do mapy tam, kde se sejdete.</p>
              <LocationPicker
                value={field.value}
                onChange={(point) => field.onChange(point)}
                center={mapCenter}
                labelledBy={placeLabelId}
                isInvalid={Boolean(fieldState.error)}
                describedBy={fieldState.error ? placeErrorId : undefined}
              />
              <FormMessage id={placeErrorId} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adresa *</FormLabel>
              <FormControl>
                <Input
                  placeholder="např. Herna Karlín, Křižíkova 52, Praha 8"
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
          name="startsAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Datum a čas (čas v ČR) *</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  min={toPragueWallTime(new Date())}
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="minParticipants"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum lidí *</FormLabel>
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
                <FormLabel>Maximum lidí *</FormLabel>
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

        <FormField
          control={form.control}
          name="approvalMode"
          render={({ field }) => (
            <FormItem>
              <FormLabel id={`${approvalId}-label`}>Způsob přihlašování *</FormLabel>
              <FormControl>
                <RadioGroup
                  // a <label for> can't name a radiogroup; this does
                  aria-labelledby={`${approvalId}-label`}
                  ref={field.ref}
                  value={field.value}
                  onValueChange={field.onChange}
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
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Popis</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="např. Hrajeme středně těžké hry, hry půjčíme."
                  className="min-h-24"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Zveřejnit akci
        </Button>
      </form>
    </Form>
  )
}
