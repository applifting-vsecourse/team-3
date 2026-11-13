import { useId, type ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { RatingStars } from "@/components/RatingStars/RatingStars"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { inSentence } from "@/lib/inSentence"
import { cn } from "@/lib/utils"

import {
  RATING_COMMENT_MAX_LENGTH,
  RATING_STARS_MAX,
  RATING_WINDOW_DAYS,
  type EventRatingInput,
  type MyEventRating,
} from "@/features/events/api/ratingSchemas"
import { PastEventCard } from "@/features/events/components/PastEventCard"
import { formatEventDay } from "@/features/events/lib/formatEvent"

const STARS_MESSAGE = `Vyber 1 až ${RATING_STARS_MAX} hvězdiček`

// Same rules as the API (RateEventDto), so the form says so before the server does.
const stars = z
  .number()
  .int()
  .min(1, STARS_MESSAGE)
  .max(RATING_STARS_MAX, STARS_MESSAGE)
  .nullable()
  .refine((value) => value !== null, STARS_MESSAGE)
  .transform((value) => value ?? 0)

const schema = z.object({
  eventStars: stars,
  organizerStars: stars,
  comment: z
    .string()
    .trim()
    .max(RATING_COMMENT_MAX_LENGTH, `Komentář může mít nejvýš ${RATING_COMMENT_MAX_LENGTH} znaků`),
})

type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

type RateEventFormProps = {
  data: MyEventRating
  isSaving: boolean
  onSave: (input: EventRatingInput) => Promise<unknown>
}

/**
 * Figma C-03, C-03d: the event's card and the two questions with stars, the comment beside them
 * on desktop (two columns, DESIGN.md › Layout), under them on a phone; then the one primary
 * button and until when the rating can be changed. An earlier rating fills the form in.
 */
export function RateEventForm({ data, isSaving, onSave }: RateEventFormProps) {
  const { event, rating, ratableUntil } = data
  const eventQuestionId = useId()
  const organizerQuestionId = useId()
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      eventStars: rating?.eventStars ?? null,
      organizerStars: rating?.organizerStars ?? null,
      comment: rating?.comment ?? "",
    },
  })
  // for an event of a group the organizer stars count to the group (B-060)
  const rated = event.group
    ? { name: event.group.name, role: "skupina", average: "hodnocení skupiny" }
    : { name: event.organizer.name, role: "organizátor", average: "hodnocení organizátora" }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(async (values) => {
          const input = { ...values, comment: values.comment || null }
          try {
            await onSave(input)
          } catch (error) {
            // the stars and the comment stay to try again; a refusal also shows on the page
            toast.error((error as Error).message)
            return
          }
          toast.success(rating ? "Hodnocení je změněné" : "Díky, hodnocení je uložené")
          form.reset({ ...input, comment: input.comment ?? "" })
        })}
        className="flex flex-col gap-6"
      >
        <div className="grid gap-6 md:grid-cols-2 md:gap-12">
          {/* min-w-0: the card's truncated line would widen the column past a phone's width */}
          <div className="flex min-w-0 flex-col gap-6">
            <PastEventCard
              event={event}
              // the detail: a former member of the group gets a 403 there (review #315)
              isLinked={false}
            />
            <FormField
              control={form.control}
              name="eventStars"
              render={({ field, fieldState }) => (
                <FormItem className="gap-2">
                  <Question
                    id={eventQuestionId}
                    isInvalid={fieldState.invalid}
                  >
                    Jak se akce povedla?
                  </Question>
                  <FormControl>
                    <RatingStars
                      value={field.value}
                      onChange={field.onChange}
                      aria-labelledby={eventQuestionId}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="organizerStars"
              render={({ field, fieldState }) => (
                <FormItem className="gap-2">
                  <Question
                    id={organizerQuestionId}
                    isInvalid={fieldState.invalid}
                  >
                    Jak hodnotíš organizátora?
                  </Question>
                  <FormDescription>
                    {rated.name} · {rated.role}
                  </FormDescription>
                  <FormControl>
                    <RatingStars
                      value={field.value}
                      onChange={field.onChange}
                      aria-labelledby={organizerQuestionId}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="comment"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>Komentář (nepovinné)</FormLabel>
                <FormControl>
                  <Textarea
                    className="min-h-24"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Komentář uvidí organizátor. Hvězdičky se započítají do průměru akce a{" "}
                  {rated.average}.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          className="h-11 w-full md:w-fit"
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
          {rating ? "Uložit změny" : "Odeslat hodnocení"}
        </Button>
        <p className="text-sm text-muted-foreground">
          {ratingWindowNote(ratableUntil, event.group !== null)}
        </p>
      </form>
    </Form>
  )
}

/**
 * A question above the stars. Not a <label>: the stars are a radio group, not one field it could
 * point to; the group takes its name from this text through aria-labelledby (review #315).
 */
function Question({
  id,
  isInvalid,
  children,
}: {
  id: string
  isInvalid: boolean
  children: ReactNode
}) {
  return (
    <p
      id={id}
      className={cn("text-sm leading-none font-medium", isInvalid && "text-destructive")}
    >
      {children}
    </p>
  )
}

/**
 * Under the button (Figma C-03): until when, with the day, in the words the rest of the page
 * uses — „Hodnotit jde 14 dní po akci, tedy do po 23. 11., a do té doby hodnocení změníš.“
 */
export function ratingWindowNote(ratableUntil: Date, isGroupEvent: boolean): string {
  const until = `Hodnotit jde ${RATING_WINDOW_DAYS} dní po akci, tedy do ${inSentence(
    formatEventDay(ratableUntil),
  )}, a do té doby hodnocení změníš.`
  return isGroupEvent ? `${until} U akce skupiny se hodnocení organizátora počítá skupině.` : until
}
