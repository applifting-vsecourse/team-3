import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

type ComingSoonProps = {
  title: string
}

/**
 * Placeholder for sections linked from the navigation that aren't built yet,
 * so the links lead somewhere instead of a 404.
 */
export function ComingSoon({ title }: ComingSoonProps) {
  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
      <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">{title}</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Připravujeme</h1>
      <p className="mt-2 text-muted-foreground">Na této části HobbyHubu právě pracujeme.</p>
      <Button
        asChild
        variant="outline"
        className="mt-6"
      >
        <Link to={ROUTES.home}>Zpět na úvod</Link>
      </Button>
    </section>
  )
}
