import { Button } from "@/components/ui/button"

import { ErrorLayout } from "./ErrorLayout"

type RootErrorBoundaryProps = {
  error: Error
}

// The message of an unexpected error is technical (and English): it stays in
// the console, where the router logs it; the user gets a way on.
export function RootErrorBoundary(_props: RootErrorBoundaryProps) {
  return (
    <ErrorLayout
      title="Něco se pokazilo"
      description="Zkus stránku načíst znovu. Když to nepomůže, vrať se na úvod."
      action={<Button onClick={() => window.location.reload()}>Načíst znovu</Button>}
    />
  )
}
