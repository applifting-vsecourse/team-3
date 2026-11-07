import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { PageBand } from "@/components/PageBand/PageBand"
import { Button } from "@/components/ui/button"
import { PAGE } from "@/lib/pageLayout"

type ComingSoonProps = {
  title: string
}

/**
 * Placeholder for sections linked from the navigation that aren't built yet,
 * so the links lead somewhere instead of a 404. Starts with the band like any page.
 */
export function ComingSoon({ title }: ComingSoonProps) {
  return (
    <>
      <PageBand
        title={title}
        description="Připravujeme – na této části HobbyHubu právě pracujeme."
      />
      <section className={PAGE}>
        <Button
          asChild
          variant="outline"
          className="w-fit"
        >
          <Link to={ROUTES.home}>Zpět na úvod</Link>
        </Button>
      </section>
    </>
  )
}
