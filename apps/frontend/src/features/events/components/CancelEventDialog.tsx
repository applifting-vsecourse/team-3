import { Ban } from "lucide-react"

import { ReasonDialog } from "@/features/events/components/ReasonDialog"

type CancelEventDialogProps = {
  isPending: boolean
  /** Figma D-03d: a quiet ghost with its icon beside „Upravit akci“; outline elsewhere. */
  triggerVariant?: "outline" | "ghost"
  className?: string
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
export function CancelEventDialog({
  isPending,
  onCancel,
  triggerVariant = "outline",
  className,
}: CancelEventDialogProps) {
  return (
    <ReasonDialog
      trigger={{ label: "Zrušit akci", icon: <Ban />, variant: triggerVariant, className }}
      title="Zrušit akci?"
      description="Akce zmizí ze seznamu a z mapy. Přes odkaz zůstane vidět se štítkem „Zrušeno“ a s tvým důvodem."
      label="Důvod zrušení *"
      placeholder="např. Herna má ten den zavřeno."
      requiredMessage="Napiš, proč se akce ruší"
      submit={{ label: "Zrušit akci", variant: "destructive" }}
      isPending={isPending}
      onSubmit={onCancel}
    />
  )
}
