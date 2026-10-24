import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

// the same limit as the API's CancelEventDto
const REASON_MAX_LENGTH = 500

const schema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Napište, proč se akce ruší")
    .max(REASON_MAX_LENGTH, `Důvod může mít nejvýš ${REASON_MAX_LENGTH} znaků`),
})

type CancelEventDialogProps = {
  isPending: boolean
  /**
   * Resolves once the event is cancelled, and the dialog closes; rejects when
   * it couldn't be, and the dialog stays open to try again.
   */
  onCancel: (reason: string) => Promise<unknown>
}

/**
 * The organizer cancels the event (#52, B-028): a required reason, which the
 * participants see on the detail. The event is never deleted.
 */
export function CancelEventDialog({ isPending, onCancel }: CancelEventDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const form = useForm<z.input<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "" },
  })

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isNowOpen) => {
        setIsOpen(isNowOpen)
        if (!isNowOpen) form.reset()
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="self-start"
        >
          Zrušit akci
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit(async ({ reason }) => {
              try {
                await onCancel(reason.trim())
                setIsOpen(false)
              } catch {
                // the page says why; the reason stays in the field
              }
            })}
            className="flex flex-col gap-4"
          >
            <DialogHeader>
              <DialogTitle>Zrušit akci?</DialogTitle>
              <DialogDescription>
                Akce zmizí ze seznamu a z mapy. Přes odkaz zůstane vidět se štítkem „Zrušeno“ a s
                vaším důvodem.
              </DialogDescription>
            </DialogHeader>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Důvod zrušení *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="např. Herna má ten den zavřeno."
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                >
                  Zpět
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant="destructive"
                disabled={isPending}
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Zrušit akci
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
