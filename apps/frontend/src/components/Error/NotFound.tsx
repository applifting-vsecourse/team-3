import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

import { ErrorLayout } from "./ErrorLayout"

export function NotFound() {
  return (
    <ErrorLayout
      title="Stránka neexistuje"
      description="Odkaz je možná překlep, nebo stránka už není."
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to={ROUTES.events}>Procházet akce</Link>
          </Button>
          <Button
            asChild
            variant="outline"
          >
            <Link to={ROUTES.home}>Na úvod</Link>
          </Button>
        </div>
      }
    />
  )
}
