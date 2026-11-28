import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { HomeSection } from "@/components/HomeSection/HomeSection"
import { PersonRow } from "@/components/PersonRow/PersonRow"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { inSentence } from "@/lib/inSentence"

import { partnerHomeQueryOptions } from "@/features/partners/api/partnersQueryOptions"
import type { Partner } from "@/features/partners/api/partnersSchemas"
import { useHidePartnersHome } from "@/features/partners/hooks/usePartnerActions"
import { distanceLabel } from "@/features/partners/lib/partnerDeck"

export const PARTNERS_HIDDEN_TOAST =
  "Parťáky na úvodní stránce teď skrýváme. Najdeš je dál v profilu."

/** „asi 5 km · Oba vás baví: volejbal, běh“ — the card's band and what we share. */
export const partnerRowLine = (partner: Pick<Partner, "distanceBandKm" | "sharedInterests">) =>
  `${distanceLabel(partner.distanceBandKm)} · Oba vás baví: ${partner.sharedInterests
    .map(({ name }) => inSentence(name))
    .join(", ")}`

/**
 * „Parťáci v okolí“ on the landing page, signed in only (#474, research §2): the first three of
 * the deck as rows, the name leading to the public profile. No „Přidat“ here, no cards, no
 * carousel — deciding belongs to the deck with its limit and „Vrátit“. The API decides whether
 * it shows (`isShown`: the profile complete, visible, 3 people, no visit to /partaci in 7 days,
 * no „Skrýt“ in 30, under 10 friends); otherwise, and on an error, it isn't in the page at all.
 */
export function PartnersNearby({ viewerId }: { viewerId: string }) {
  const query = useQuery(partnerHomeQueryOptions(viewerId))
  const hide = useHidePartnersHome(viewerId)
  if (query.isPending) return <PartnersNearbySkeleton />
  // an extra section: an error must not take the rest of the page down
  if (!query.data?.isShown) return null
  return (
    <HomeSection
      heading={{ before: "Parťáci ", keyword: "v okolí" }}
      description="Lidi z okolí, které baví to co tebe."
      more={{ label: "Zobrazit všechny", link: { to: ROUTES.partners } }}
      footer={
        <Button
          type="button"
          variant="ghost"
          className="min-h-10 self-start"
          disabled={hide.isPending}
          onClick={() =>
            hide.mutate(undefined, {
              onSuccess: () => toast.success(PARTNERS_HIDDEN_TOAST),
              onError: () => toast.error("Parťáky se nepodařilo skrýt. Zkus to znovu."),
            })
          }
        >
          Skrýt
        </Button>
      }
    >
      <ul
        aria-label="Parťáci v okolí"
        className="flex flex-col gap-4"
      >
        {query.data.items.map((partner) => (
          <li key={partner.id}>
            <PersonRow
              name={partner.name}
              userId={partner.id}
              description={partnerRowLine(partner)}
            />
          </li>
        ))}
      </ul>
    </HomeSection>
  )
}

function PartnersNearbySkeleton() {
  return (
    <div
      role="status"
      aria-label="Načítám parťáky v okolí"
      className="flex flex-col gap-4"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3"
        >
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      ))}
    </div>
  )
}
