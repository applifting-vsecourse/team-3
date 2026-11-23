import { useId, useState } from "react"
import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { PageBand } from "@/components/PageBand/PageBand"
import { PersonRow } from "@/components/PersonRow/PersonRow"
import { Seo } from "@/components/Seo"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import {
  PARTNER_RADII,
  type Partner,
  type PartnerRadius,
} from "@/features/partners/api/partnersSchemas"
import { sharedInterestsLabel } from "@/features/partners/lib/partnerDeck"

import { PartnerDeck } from "./PartnerDeck"

/**
 * /partaci, Najdi parťáka (#84): the band, the okolí, the deck on the left and on desktop what
 * this visit brought on the right — the new matches — with how it works, so no half of the
 * screen stays empty (DESIGN.md › Layout). On a phone only the deck, its buttons above the
 * bottom navigation.
 */
export function PartnersPage({
  viewerId,
  viewerName,
  radiusKm,
  onRadiusChange,
  onFriendsChanged,
}: {
  viewerId: string
  viewerName: string
  radiusKm: PartnerRadius
  onRadiusChange: (radius: PartnerRadius) => void
  onFriendsChanged?: () => Promise<unknown>
}) {
  const [matches, setMatches] = useState<Partner[]>([])
  const radiusLabelId = useId()
  const matchesHeadingId = useId()
  return (
    <>
      <Seo title="Najdi parťáka" />
      <PageBand
        title={
          <>
            Najdi <span className="highlight-keyword">parťáka</span>
          </>
        }
        description="Lidi z okolí, které baví to co tebe."
        back={{ to: ROUTES.profile, fallbackLabel: "Můj profil", label: "Můj profil" }}
      />
      <div className={cn(PAGE, "gap-6 pb-24")}>
        <div className="flex flex-wrap items-center gap-3">
          <p
            id={radiusLabelId}
            className="text-sm font-semibold"
          >
            Okolí
          </p>
          <ToggleGroup
            type="single"
            aria-labelledby={radiusLabelId}
            value={String(radiusKm)}
            // a single group can be emptied by a second click; the radius stays then
            onValueChange={(next) => {
              const radius = PARTNER_RADII.find((option) => String(option) === next)
              if (radius) onRadiusChange(radius)
            }}
            spacing={2}
            className="flex-wrap"
          >
            {PARTNER_RADII.map((option) => (
              <ToggleGroupItem
                key={option}
                value={String(option)}
                variant="outline"
                // the okolí chips of /akce, dark when picked
                className="h-9 rounded-full px-4 data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:font-semibold data-[state=on]:text-background"
              >
                +{option} km
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="grid gap-12 md:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
          <PartnerDeck
            // a new radius is a new deck: what this one did with its cards doesn't carry over
            key={radiusKm}
            viewerId={viewerId}
            viewerName={viewerName}
            radiusKm={radiusKm}
            onWiden={onRadiusChange}
            onFriendsChanged={onFriendsChanged}
            onMatch={(partner) => setMatches((previous) => [partner, ...previous])}
          />
          <aside className="flex flex-col gap-8 max-md:hidden">
            <section
              aria-labelledby={matchesHeadingId}
              className="flex flex-col gap-3"
            >
              <h2
                id={matchesHeadingId}
                className="type-card-heading"
              >
                Nové shody
              </h2>
              {matches.length ? (
                <ul className="flex flex-col gap-3">
                  {matches.map((partner) => (
                    <li key={partner.id}>
                      <PersonRow
                        name={partner.name}
                        userId={partner.id}
                        description={sharedInterestsLabel(partner.sharedInterests.length)}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Když tě někdo přidá taky, je to shoda a jste rovnou přátelé.
                </p>
              )}
            </section>
            <section className="flex flex-col gap-2">
              <h2 className="type-card-heading">Jak to funguje</h2>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                <li>„Přidat“ pošle žádost o přátelství. Uvidí ji jen člověk, kterého přidáš.</li>
                <li>„Teď ne“ je tiché a nikdo se o něm nedozví. Poslední můžeš vrátit.</li>
                <li>Vzdálenost je jen přibližná, mezi středy vašich domovských míst.</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                Nechceš se ukazovat ostatním? Vypni to v{" "}
                <Link
                  to={ROUTES.editProfile}
                  className="underline underline-offset-4"
                >
                  úpravě profilu
                </Link>
                .
              </p>
            </section>
          </aside>
        </div>
      </div>
    </>
  )
}
