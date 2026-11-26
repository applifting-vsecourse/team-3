import { Link } from "@tanstack/react-router"
import { Plus } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

/**
 * „Založit akci“ in the /akce band (PO 26. 11.: „V seznamu akcí zmizel button na založení
 * akce“): beside the title, the band's primary. On a phone it stays small in the band, where
 * the map, its preview and the list sheet leave no room for a floating button.
 */
export function CreateEventButton() {
  return (
    <Button
      asChild
      className="h-10 md:h-11 md:px-6"
    >
      <Link to={ROUTES.newEvent}>
        <Plus aria-hidden />
        Založit akci
      </Link>
    </Button>
  )
}
