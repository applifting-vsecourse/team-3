import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { EyeOff, Loader2 } from "lucide-react"
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

// the same limit as the API's HideEventDto
const REASON_MAX_LENGTH = 500

const schema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Napiš, proč akci deaktivuješ")
    .max(REASON_MAX_LENGTH, `Důvod může mít nejvýš ${REASON_MAX_LENGTH} znaků`),
})

type HideEventDialogProps = {
  isPending: boolean
  /**
   * Resolves once the event is deactivated, and the dialog closes; rejects
   * when it couldn't be, and the dialog stays open to try again.
   */
  onHide: (reason: string) => Promise<unknown>
}

/**
 * The superadmin deactivates an event (#308), with the pattern of „Zrušit
 * akci“ (CancelEventDialog): a required reason, which goes to the history of
 * interventions. Unlike cancelling, nobody is e-mailed and it can be undone.
 */
export function HideEventDialog({ isPending, onHide }: HideEventDialogProps) {
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
          <EyeOff />
          Deaktivovat
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit(async ({ reason }) => {
              try {
                await onHide(reason.trim())
                setIsOpen(false)
              } catch {
                // the page says why; the reason stays in the field
              }
            })}
            className="flex flex-col gap-4"
          >
            <DialogHeader>
              <DialogTitle>Deaktivovat akci?</DialogTitle>
              <DialogDescription>
                Akce zmizí z výpisu, mapy, úvodní stránky i z Moje akce a na odkazu se ukáže, že
                není dostupná. Nikomu nepřijde e-mail a akci jde kdykoli obnovit.
              </DialogDescription>
            </DialogHeader>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Důvod deaktivace *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="např. Akce nabízí placené služby, ne společný koníček."
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
                Deaktivovat
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
