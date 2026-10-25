import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import type { SimulatedEmail } from "@/features/auth/api/simulatedInbox"

type SimulatedInboxDialogProps = {
  /** Where the e-mail would have gone: the signed-in user's address. */
  email: string
  /** Newest first, as the API sends them. */
  messages: SimulatedEmail[]
  /** Opening asks for the inbox again: the e-mail may have come after the last look. */
  onOpen: () => void
}

/**
 * Where no e-mail service is set up (staging, #58), the verification e-mail
 * opens in the app instead, with its link. Only the newest one: it is the one
 * whose link works.
 */
export function SimulatedInboxDialog({ email, messages, onOpen }: SimulatedInboxDialogProps) {
  const [latest] = messages
  return (
    <Dialog
      onOpenChange={(isOpen) => {
        if (isOpen) onOpen()
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
        >
          Otevřít e-mail (simulace)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Simulovaná schránka</DialogTitle>
          <DialogDescription>
            Na tomhle prostředí se e-maily neodesílají – tady je, co by ti přišlo.
          </DialogDescription>
        </DialogHeader>
        {latest ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <p className="font-semibold">{latest.subject}</p>
              <p className="text-sm text-muted-foreground">
                Pro {email} · {formatSentAt(latest.sentAt)}
              </p>
            </div>
            {/* no scripts; the link may only take the whole tab, and only on a click */}
            <iframe
              title={latest.subject}
              srcDoc={linksInWholeTab(latest.html)}
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
              className="h-96 w-full rounded-lg border border-border"
            />
          </div>
        ) : (
          <p className="text-muted-foreground">Zatím tu nic není – pošli si odkaz znovu.</p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Zavřít</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const dayMonthFormat = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: "Europe/Prague",
  day: "numeric",
  month: "numeric",
})
const timeFormat = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: "Europe/Prague",
  hour: "numeric",
  minute: "2-digit",
})

/** „25. 10. v 14:03“, like the time of a request. */
function formatSentAt(date: Date): string {
  const parts = dayMonthFormat.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""
  return `${get("day")}. ${get("month")}. v ${timeFormat.format(date)}`
}

/**
 * The e-mail's links open in this tab, as from a mail client: the template's
 * button asks for a new window (`target="_blank"`), and a plain link would
 * only replace the frame. Parsed inertly (DOMParser runs nothing).
 */
function linksInWholeTab(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html")
  for (const link of doc.querySelectorAll("a[href]")) link.setAttribute("target", "_top")
  const doctype = doc.doctype ? new XMLSerializer().serializeToString(doc.doctype) : ""
  return doctype + doc.documentElement.outerHTML
}
