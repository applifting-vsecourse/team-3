import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Textarea } from "@/components/ui/textarea"
import { apiValidationMessages } from "@/lib/api-client"
import { cn } from "@/lib/utils"

import {
  MESSAGE_BODY_MAX_LENGTH,
  MESSAGE_SUBJECT_MAX_LENGTH,
} from "@/features/events/api/eventSchemas"
import { eventMessagesQueryOptions } from "@/features/events/api/eventsQueryOptions"
import { useSendEventMessage } from "@/features/events/hooks/useSendEventMessage"
import { messageRecipientsLabel, remainingMessagesLabel } from "@/features/events/lib/eventMessages"

// Same rules as the API (CreateEventMessageDto), so the dialog says so before the server does.
const schema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, "Napiš předmět")
    .max(MESSAGE_SUBJECT_MAX_LENGTH, `Předmět může mít nejvýš ${MESSAGE_SUBJECT_MAX_LENGTH} znaků`),
  body: z
    .string()
    .trim()
    .min(1, "Napiš text zprávy")
    .max(MESSAGE_BODY_MAX_LENGTH, `Text může mít nejvýš ${MESSAGE_BODY_MAX_LENGTH} znaků`),
})

type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

type SendEventMessageButtonProps = {
  eventId: string
  /** The signed-in organizer, whose answer carries what is left of today's limit. */
  viewerId: string
  /** Approved participants without the organizer; undefined while they load. */
  recipientCount: number | undefined
  /** The management's next step makes it the primary button (#371). */
  variant?: "default" | "outline"
  className?: string
}

// Which field a validation message of the API is about: the DTO words them per field
// („Napiš předmět“, „Předmět může mít…“, „Napiš text zprávy“, „Text může mít…“, review #395).
// One it doesn't recognise still shows, in the dialog's Alert.
const FIELD_OF_MESSAGE: [RegExp, keyof FormInput][] = [
  [/předmět/i, "subject"],
  [/text/i, "body"],
]

const fieldErrorsOf = (error: unknown) => {
  const errors: Partial<Record<keyof FormInput, string>> = {}
  const rest: string[] = []
  for (const message of apiValidationMessages(error)) {
    const field = FIELD_OF_MESSAGE.find(([words]) => words.test(message))?.[1]
    if (field && !errors[field]) errors[field] = message
    else if (!field) rest.push(message)
  }
  return { errors, rest }
}

/**
 * „Napsat účastníkům“ in the event's management (#176, Figma D-04, D-04d):
 * subject and text, every approved participant gets it by e-mail and sees it
 * on the event's detail. Under the text, what is left of today's limit. Like
 * „Napsat členům“ (#194), the dialog waits for the answer and keeps the text
 * when sending fails.
 */
export function SendEventMessageButton({
  eventId,
  viewerId,
  recipientCount,
  variant = "outline",
  className,
}: SendEventMessageButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const send = useSendEventMessage(eventId, viewerId)
  const messagesQuery = useQuery(eventMessagesQueryOptions(eventId, viewerId))
  const remainingToday = messagesQuery.data?.remainingToday
  // today's limit is used up: the dialog says so, and sending would only end in 429
  const isLimitReached = remainingToday === 0
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { subject: "", body: "" },
  })
  // a refusal not about one field (the daily limit, a cancelled event): in the dialog, which
  // keeps the text to try again (DESIGN.md › Forms)
  const [refusal, setRefusal] = useState<string | null>(null)

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isNowOpen) => {
        setIsOpen(isNowOpen)
        if (!isNowOpen) {
          form.reset()
          setRefusal(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size="lg"
          className={cn("h-11", className)}
        >
          Napsat účastníkům
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit(async (values) => {
              setRefusal(null)
              try {
                await send.mutateAsync(values)
              } catch (error) {
                // the text stays in the dialog to try again
                const { errors, rest } = fieldErrorsOf(error)
                const fieldErrors = Object.entries(errors) as [keyof FormInput, string][]
                fieldErrors.forEach(([field, message], i) =>
                  form.setError(field, { message }, { shouldFocus: i === 0 }),
                )
                if (!fieldErrors.length || rest.length) {
                  setRefusal(rest.length ? rest.join(", ") : (error as Error).message)
                }
                return
              }
              toast.success("Zpráva je odeslaná")
              setIsOpen(false)
              form.reset()
            })}
            className="flex flex-col gap-4"
          >
            {/* Figma D-04: on a phone too the title is left-aligned and the buttons sit side by side */}
            <DialogHeader className="text-left">
              <DialogTitle>Napsat účastníkům</DialogTitle>
              <DialogDescription>
                {recipientCount === undefined
                  ? "Zpráva přijde e-mailem všem schváleným účastníkům a uvidí ji na detailu akce."
                  : messageRecipientsLabel(recipientCount)}
              </DialogDescription>
            </DialogHeader>
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Předmět</FormLabel>
                  <FormControl>
                    <Input
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
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Text</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  {typeof remainingToday === "number" ? (
                    <FormDescription>{remainingMessagesLabel(remainingToday)}</FormDescription>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
            {refusal ? (
              <Alert variant="destructive">
                <AlertDescription>{refusal}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter className="flex-row justify-end">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-11"
                >
                  Zpět
                </Button>
              </DialogClose>
              <Button
                type="submit"
                size="lg"
                className="h-11"
                disabled={send.isPending || isLimitReached}
              >
                {send.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Odeslat
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
