import { useEffect, useRef, useState } from "react"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// typing settles before the list is asked again
const DEBOUNCE_MS = 300

type EventSearchProps = {
  /** `?q=` of the page. */
  value: string | undefined
  /** The search as typed, trimmed; undefined when empty. */
  onChange: (q: string | undefined) => void
  /** Phone: the field opened from the header's „Hledat“ takes the focus. */
  isAutoFocused?: boolean
  className?: string
}

/**
 * „Hledat akci nebo aktivitu“ (#57, Figma A-02d, A-02): the title, or a keyword of the
 * activity, without diacritics. Not the main control: right in the desktop filter bar, behind
 * the magnifier in the phone's header. It writes `?q=` once typing stops (Enter at once).
 */
export function EventSearch({ value, onChange, isAutoFocused, className }: EventSearchProps) {
  const [text, setText] = useState(value ?? "")
  // what the URL has from this field; anything else came from outside („Zrušit vše“, back)
  const [sent, setSent] = useState(value ?? "")
  if ((value ?? "") !== sent) {
    setSent(value ?? "")
    setText(value ?? "")
  }
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  const send = (raw: string) => {
    const q = raw.trim()
    if (q === sent) return
    setSent(q)
    onChangeRef.current(q || undefined)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      const q = text.trim()
      if (q === sent) return
      setSent(q)
      onChangeRef.current(q || undefined)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [text, sent])

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        send(text)
      }}
      className={cn("relative", className)}
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        aria-label="Hledat akci nebo aktivitu"
        placeholder="Hledat akci nebo aktivitu"
        maxLength={100}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- opened on purpose from the header's „Hledat“
        autoFocus={isAutoFocused}
        // Figma: a pill like the chips beside it; 16 px on phones, or iOS zooms in
        className="h-9 rounded-full bg-background pl-9 text-base md:text-sm"
      />
    </form>
  )
}
