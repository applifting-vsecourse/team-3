import { useId, useState } from "react"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"

import {
  createBioSuggestions,
  nextBioSuggestionIndex,
} from "@/features/onboarding/lib/bioSuggestions"

type BioSuggestionProps = {
  bio: string
  name: string
  activityNames: string[]
  localityName?: string
  isDisabled: boolean
  apply: (value: string) => void
}

export function OnboardingBioSuggestion({
  bio,
  name,
  activityNames,
  localityName,
  isDisabled,
  apply,
}: BioSuggestionProps) {
  const id = useId()
  const [cursor, setCursor] = useState(0)
  const [lastApplied, setLastApplied] = useState<string>()
  const [replacement, setReplacement] = useState<{ original: string; text: string }>()
  const pending = replacement?.original === bio ? replacement : undefined

  function applySuggestion(text: string) {
    apply(text)
    setLastApplied(text)
    setReplacement(undefined)
  }

  function suggest() {
    const ideas = createBioSuggestions({ displayName: name, activityNames, localityName })
    const current = ideas[cursor]
    if (!current) return
    const next = nextBioSuggestionIndex(cursor, 1, ideas.length)
    // Reentering the step with a previously applied draft must still yield a new text.
    const choice = current.text === bio ? (ideas[next] ?? current) : current
    setCursor(nextBioSuggestionIndex(ideas.indexOf(choice), 1, ideas.length))
    if (bio.trim() && bio !== lastApplied) setReplacement({ original: bio, text: choice.text })
    else applySuggestion(choice.text)
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        aria-controls={id}
        className="group min-h-11 w-fit gap-2 rounded-full px-4"
        disabled={isDisabled}
        onClick={suggest}
      >
        <Sparkles
          aria-hidden
          className="hh-wizard-sparkle"
        />{" "}
        Navrhnout text
      </Button>
      <div id={id}>
        {pending ? (
          <div className="hh-wizard-suggestion space-y-3 rounded-xl border border-tile-border bg-card p-4">
            <div
              role="status"
              className="space-y-1"
            >
              <p className="text-sm font-semibold">Chceš rozepsané představení nahradit?</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{pending.text}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="min-h-11"
                disabled={isDisabled}
                onClick={() => applySuggestion(pending.text)}
              >
                Nahradit text
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={isDisabled}
                onClick={() => setReplacement(undefined)}
              >
                Ponechat rozepsané
              </Button>
            </div>
          </div>
        ) : null}
        <span
          role="status"
          className="sr-only"
        >
          {lastApplied && bio === lastApplied && !pending
            ? `Návrh v poli O mně. ${lastApplied}`
            : ""}
        </span>
      </div>
    </div>
  )
}
