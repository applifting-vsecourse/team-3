import { LogoMark } from "@/components/Logo/Logo"

type HasPlaceProps = {
  /** Under the title: where changes show, or the thanks when this sign-up made the event happen. */
  line?: string
  /** Right after joining, the „ty“ dot fills in (only under motion-safe). */
  isFillAnimated?: boolean
}

/**
 * „Máš místo“ (Figma Máš místo, DESIGN.md › Máš místo): the user's place on an event, in the
 * detail's action instead of a bare „Jdu“. Secondary with its tile-border; the accent bar on
 * the left shows in dark mode only — in light mode it is secondary on purpose.
 */
export function HasPlace({ line, isFillAnimated = false }: HasPlaceProps) {
  return (
    <div className="relative flex gap-3 overflow-hidden rounded-lg border border-tile-border bg-secondary p-4 text-secondary-foreground">
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1 bg-accent-bar"
      />
      <LogoMark
        isFull
        isFillAnimated={isFillAnimated}
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-base leading-5 font-semibold">Máš místo. Parta je o jednoho větší.</p>
        {line ? <p className="text-sm">{line}</p> : null}
      </div>
    </div>
  )
}

/**
 * „Díky tobě se akce koná – sešlo se 6 lidí, minimum je 6.“ — only when this sign-up reached
 * the minimum (Figma A-05c).
 */
export function happeningThanks(approvedCount: number, minParticipants: number): string {
  if (approvedCount === 1) return "Díky tobě se akce koná."
  const gathered =
    approvedCount >= 2 && approvedCount <= 4
      ? `sešli se ${approvedCount} lidé`
      : `sešlo se ${approvedCount} lidí`
  return `Díky tobě se akce koná – ${gathered}, minimum je ${minParticipants}.`
}
