import { LogoMark } from "@/components/Logo/Logo"

type HasPlaceProps = {
  /** Under the title: where changes show, or the thanks when this sign-up made the event happen. */
  line?: string
  /** Right after joining, the „ty“ dot fills in (only under motion-safe). */
  isFillAnimated?: boolean
}

/**
 * „Máš místo“ (Figma Máš místo, DESIGN.md › Máš místo): the user's place on an event, in the
 * detail's action instead of a bare „Jdu“. Secondary, edged by its tile-border — no accent bar.
 */
export function HasPlace({ line, isFillAnimated = false }: HasPlaceProps) {
  return (
    <div className="flex gap-3 rounded-lg border border-tile-border bg-secondary p-4 text-secondary-foreground">
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
