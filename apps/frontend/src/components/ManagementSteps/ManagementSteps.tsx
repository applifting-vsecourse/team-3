import { useId } from "react"
import { Copy } from "lucide-react"

import { absoluteLink, ShareLinkButton } from "@/components/ShareLinkButton/ShareLinkButton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ManagementStepsProps = {
  /** What happens next, in order — from the event's or the group's own rules. */
  steps: string[]
  /**
   * The page to invite to, offered to copy on desktop („Odkaz na akci“); a phone shares it
   * from the next step's button, whose share sheet copies it too.
   */
  link?: { path: string; title: string; label: string }
}

/**
 * The next step of an empty management list (Figma D-03d – nikdo nejde, D-07d – jen ty; #371):
 * the link to copy and „Jak to půjde dál“, instead of one sentence and an empty column.
 */
export function ManagementSteps({ steps, link }: ManagementStepsProps) {
  const linkId = useId()
  const headingId = useId()
  return (
    <div className="flex flex-col gap-6">
      {link ? (
        <div className="hidden items-end gap-3 md:flex">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Label htmlFor={linkId}>{link.label}</Label>
            <Input
              id={linkId}
              readOnly
              value={absoluteLink(link.path)}
              onFocus={(event) => event.currentTarget.select()}
            />
          </div>
          <ShareLinkButton
            path={link.path}
            title={link.title}
            label="Kopírovat odkaz"
            icon={Copy}
          />
        </div>
      ) : null}
      <section
        aria-labelledby={headingId}
        className="flex flex-col gap-4"
      >
        <h3
          id={headingId}
          className="type-card-heading"
        >
          Jak to půjde dál
        </h3>
        <ol className="flex flex-col gap-4">
          {steps.map((step, index) => (
            <li
              key={step}
              className="flex items-center gap-3"
            >
              {/* the list numbers the steps for a screen reader already */}
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-tile-border bg-secondary text-sm font-semibold text-secondary-foreground"
              >
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
