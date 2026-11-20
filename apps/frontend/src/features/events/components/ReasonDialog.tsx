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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

// the same limit as the API's CancelEventDto and HideEventDto
const REASON_MAX_LENGTH = 500

export type ReasonDialogProps = {
  /** The button that opens it. */
  trigger: {
    label: string
    icon: ReactNode
    variant?: "outline" | "ghost"
    className?: string
  }
  title: string
  description: ReactNode
  /** The field's label, with its „*“. */
  label: string
  placeholder: string
  /** Under the field when it's left empty. */
  requiredMessage: string
  submit: { label: string; variant: "default" | "destructive" }
  isPending: boolean
  /**
   * Resolves once it's done, and the dialog closes; rejects when it couldn't
   * be, and the dialog stays open with the reason to try again.
   */
  onSubmit: (reason: string) => Promise<unknown>
}

/**
 * An action on an event that needs a written reason (#52, #308): a button,
 * then a dialog with the required reason (trimmed, at most 500 characters),
 * „Zpět“ and the action. `CancelEventDialog` and `HideEventDialog` are the
 * two; they differ only in their words and how the action looks.
 */
export function ReasonDialog({
  trigger,
  title,
  description,
  label,
  placeholder,
  requiredMessage,
  submit,
  isPending,
  onSubmit,
}: ReasonDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const schema = z.object({
    reason: z
      .string()
      .trim()
      .min(1, requiredMessage)
      .max(REASON_MAX_LENGTH, `Důvod může mít nejvýš ${REASON_MAX_LENGTH} znaků`),
  })
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
          variant={trigger.variant ?? "outline"}
          className={trigger.className ?? "self-start"}
        >
          {trigger.icon}
          {trigger.label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit(async ({ reason }) => {
              try {
                await onSubmit(reason.trim())
                setIsOpen(false)
              } catch {
                // the page says why; the reason stays in the field
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
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={placeholder}
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
                variant={submit.variant}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {submit.label}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
