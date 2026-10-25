import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

import { ErrorLayout } from "./ErrorLayout"

type RootErrorBoundaryProps = {
  error: Error
}

// The message of an unexpected error is technical (and English): it stays in
// the console, where React logs it; the user gets a way on.
export function RootErrorBoundary(_props: RootErrorBoundaryProps) {
  return (
    <ErrorLayout
      title="Něco se pokazilo"
      description="Zkus stránku načíst znovu. Když to nepomůže, vrať se na úvod."
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => window.location.reload()}>Načíst znovu</Button>
          <Button
            asChild
            variant="outline"
          >
            {/* a full load: after a deploy, an old code chunk is a usual way here */}
            <Link
              to={ROUTES.home}
              reloadDocument
            >
              Na úvod
            </Link>
          </Button>
        </div>
      }
    />
  )
}
