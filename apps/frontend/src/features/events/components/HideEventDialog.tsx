import { EyeOff } from "lucide-react"

import { ReasonDialog } from "@/features/events/components/ReasonDialog"

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
 * akci“: a required reason, which goes to the history of interventions.
 * Unlike cancelling, nobody is e-mailed and it can be undone.
 */
export function HideEventDialog({ isPending, onHide }: HideEventDialogProps) {
  return (
    <ReasonDialog
      trigger={{ label: "Deaktivovat", icon: <EyeOff /> }}
      title="Deaktivovat akci?"
      description="Akce zmizí z výpisu, mapy, úvodní stránky i z Moje akce a na odkazu se ukáže, že není dostupná. Nikomu nepřijde e-mail a akci jde kdykoli obnovit."
      label="Důvod deaktivace *"
      placeholder="např. Akce nabízí placené služby, ne společný koníček."
      requiredMessage="Napiš, proč akci deaktivuješ"
      submit={{ label: "Deaktivovat", variant: "destructive" }}
      isPending={isPending}
      onSubmit={onHide}
    />
  )
}
