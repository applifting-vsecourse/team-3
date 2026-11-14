import type { ReactNode } from "react"
import { Info } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

/** An answer instead of the rating page's form: what happened and where to go (both pages). */
export function RatingExplained({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Alert
      variant="neutral"
      className="md:max-w-xl"
    >
      <Info />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{children}</p>
      </AlertDescription>
    </Alert>
  )
}
