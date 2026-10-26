import { Link } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import { DEFAULT_LOCALITY_SLUG } from "@/lib/catalog/localityOptions"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { NearestEvents } from "@/features/events/components/NearestEvents"
import { PopularEvents } from "@/features/events/components/PopularEvents"

const STEPS = [
  "Najdi akci podle místa, termínu a typu aktivity",
  "Přihlas se – účet stačí e-mail a heslo",
  "Přijdeš rovnou, nebo až tě organizátor schválí",
]

type LandingViewProps = {
  /**
   * Signed out, once the session is known: the invitation to sign up (#36)
   * and the events people are interested in (#156) are for visitors only.
   */
  isVisitor: boolean
}

/**
 * Landing page (US-01, #36; Figma A-01, A-01d). Desktop: the intro and the
 * steps on the left, the nearest events on the right, a visitor gets the
 * popular events from all of Czechia over the whole width below. Mobile:
 * intro, events, steps, popular events. The locality is always Praha for
 * now; guessing it from the IP and changing it here is #55.
 */
export function LandingView({ isVisitor }: LandingViewProps) {
  const allEventsLink = (
    <Button
      asChild
      variant="ghost"
      className="self-start"
    >
      <Link to={ROUTES.events}>
        <ChevronRight className="size-4" />
        Zobrazit všechny akce
      </Link>
    </Button>
  )

  return (
    <main
      className={cn(
        PAGE,
        "flex-1 gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,32.5rem)] lg:content-start lg:gap-x-16 lg:gap-y-6 lg:py-16",
      )}
    >
      <section className="flex flex-col gap-4 md:gap-6">
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          Najdi lidi na volnočasové akce ve svém okolí
        </h1>
        <p className="text-pretty text-muted-foreground">
          Volejbal, deskovky, běh… Přidej se k akci, které chybí lidé, nebo založ vlastní a dej o ní
          vědět.
        </p>
        <div className="flex flex-col gap-2 md:flex-row">
          <Button
            asChild
            size="lg"
          >
            <Link to={ROUTES.events}>Prohlédnout akce</Link>
          </Button>
          {isVisitor ? (
            <Button
              asChild
              size="lg"
              variant="outline"
            >
              <Link to={ROUTES.signup}>Zaregistrovat se</Link>
            </Button>
          ) : null}
        </div>
      </section>

      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <NearestEvents
          localitySlug={DEFAULT_LOCALITY_SLUG}
          footer={allEventsLink}
        />
      </div>

      <section
        aria-labelledby="jak-to-funguje"
        className="flex flex-col gap-3"
      >
        <h2
          id="jak-to-funguje"
          className="text-lg font-semibold tracking-tight"
        >
          Jak to funguje
        </h2>
        {/* The numbers stay readable: Safari drops list semantics with list-style: none. */}
        <ol className="flex flex-col gap-3">
          {STEPS.map((step, index) => (
            <li
              key={step}
              className="flex items-center gap-3"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      {isVisitor ? (
        <div className="lg:col-span-2 lg:mt-6">
          <PopularEvents footer={allEventsLink} />
        </div>
      ) : null}
    </main>
  )
}
