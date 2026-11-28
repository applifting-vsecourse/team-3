import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import { isPremiumEnabled as isPremiumOn } from "@/config/env"

import { DAILY_LIMIT_REACHED, PLUS_LIMIT_HINT } from "@/features/partners/lib/partnerDeck"

/**
 * Today's „Přidat“ is used up (#473, research › Limit): one quiet sentence under the buttons,
 * which „Přidat“ points at through `aria-describedby`. The card, „Teď ne“ and „Vrátit“ stay.
 * Only with the paid plan on a second sentence and a link (never primary: lime stays „Přidat“);
 * no countdown, no blinking, no dialog opening by itself.
 */
export function DailyLimitReached({
  id,
  isPremiumEnabled = isPremiumOn,
}: {
  /** What „Přidat“ names in its `aria-describedby`. */
  id: string
  isPremiumEnabled?: boolean
}) {
  return (
    <div className="flex flex-col items-start">
      <p
        id={id}
        className="text-sm text-muted-foreground"
      >
        {isPremiumEnabled ? `${DAILY_LIMIT_REACHED} ${PLUS_LIMIT_HINT}` : DAILY_LIMIT_REACHED}
      </p>
      {isPremiumEnabled ? (
        <Button
          asChild
          variant="link"
          className="min-h-10 px-0"
        >
          <a href={ROUTES.plans}>Zobrazit tarify</a>
        </Button>
      ) : null}
    </div>
  )
}
