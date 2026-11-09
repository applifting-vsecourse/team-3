import { Link } from "@tanstack/react-router"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

/**
 * After „Zveřejnit“ the page still opens the new event's detail (Figma D-01); the toast that
 * says so leads on to Moje akce › Pořádám, where the event is now and its requests will
 * wait (#188). A real link, so it opens in a new tab too; long enough to be reached.
 */
export function announcePublished(): void {
  const id = toast.success("Akce je zveřejněná.", {
    duration: 10_000,
    action: (
      <Button
        asChild
        size="sm"
        variant="outline"
        className="ml-auto shrink-0"
      >
        <Link
          to={ROUTES.myEvents}
          search={{ tab: "poradam" }}
          onClick={() => toast.dismiss(id)}
        >
          Moje akce › Pořádám
        </Link>
      </Button>
    ),
  })
}
