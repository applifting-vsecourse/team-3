import { useInfiniteQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { UserPen, UsersRound } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

import { partnerDeckQueryOptions } from "@/features/partners/api/partnersQueryOptions"
import { DEFAULT_PARTNER_RADIUS } from "@/features/partners/lib/partnersSearch"

/**
 * The way to Najdi parťáka under the empty friends (#474). While the deck reports `missing`
 * (no locality, interests or onboarding) it leads to the profile instead: Najdi parťáka would
 * only end on its own empty state, a dead end (EDPB 03/2022). It reads the deck /partaci opens
 * with, so the visit there starts from the cache.
 */
export function PartnerFindButton({ viewerId }: { viewerId: string }) {
  const deck = useInfiniteQuery(partnerDeckQueryOptions(viewerId, DEFAULT_PARTNER_RADIUS))
  const isProfileMissing = (deck.data?.pages[0]?.missing.length ?? 0) > 0
  return (
    <Button
      asChild
      size="lg"
    >
      {isProfileMissing ? (
        <Link to={ROUTES.editProfile}>
          <UserPen aria-hidden /> Doplnit profil
        </Link>
      ) : (
        <Link to={ROUTES.partners}>
          <UsersRound aria-hidden /> Najdi parťáka
        </Link>
      )}
    </Button>
  )
}
