import { useState, type ReactNode } from "react"
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

import {
  REQUEST_MESSAGE_MAX_LENGTH,
  requestMessageSchema,
  toRequestMessage,
} from "./requestMessage"

const schema = z.object({ message: requestMessageSchema })

type RequestDialogProps = {
  /** The button that opens the dialog. */
  children: ReactNode
  title: string
  description: string
  /** Who reads the message, e.g. „Zpráva pro organizátora (nepovinné)“. */
  label: string
  isPending: boolean
  /**
   * Resolves once the request is saved, and the dialog closes; rejects when
   * it isn't, and the dialog stays open with the message to try again.
   */
  onSend: (message: string | null) => Promise<unknown>
}

/**
 * A request to join an event or a group with an optional message (#175,
 * Figma A-05a / A-05ad, A-08a / A-08ad). Like „Zrušit akci?“, the dialog
 * waits for the answer: it doesn't close on a request that may still fail.
 */
export function RequestDialog({
  children,
  title,
  description,
  label,
  isPending,
  onSend,
}: RequestDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const form = useForm<z.input<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { message: "" },
  })

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isNowOpen) => {
        setIsOpen(isNowOpen)
        if (!isNowOpen) form.reset()
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit(async ({ message }) => {
              try {
                await onSend(toRequestMessage(message))
                setIsOpen(false)
                form.reset()
              } catch {
                // the page says why; the message stays in the field
              }
            })}
            className="flex flex-col gap-4"
          >
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Max. {REQUEST_MESSAGE_MAX_LENGTH} znaků. Napiš třeba, co hraješ a proč se
                    hlásíš.
                  </FormDescription>
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
                disabled={isPending}
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Poslat žádost
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
