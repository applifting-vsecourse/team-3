import { Ban } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

/** Figma: A-08 · Stavy tlačítka skupiny › Deaktivovaná skupina — reachable only through its link. */
export function InactiveGroupNotice() {
  return (
    <Alert variant="destructive">
      <Ban aria-hidden />
      <AlertTitle>Skupina už není aktivní</AlertTitle>
      <AlertDescription>
        Nejde se do ní přidat. Proběhlé akce zůstávají v historii.
      </AlertDescription>
    </Alert>
  )
}
