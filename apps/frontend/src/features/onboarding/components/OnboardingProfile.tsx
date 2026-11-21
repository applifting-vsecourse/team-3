import { useMemo, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, LockKeyhole } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Activity } from "@/lib/catalog/catalogSchemas"
import { initials } from "@/lib/initials"
import { NAME_MAX_LENGTH } from "@/lib/validation/name"

import {
  BIO_MAX_LENGTH,
  createBioSuggestions,
  nextBioSuggestionIndex,
} from "@/features/onboarding/lib/bioSuggestions"

type OnboardingProfileProps = {
  initialName: string
  name: string
  bio: string
  interests: Activity[]
  isSaving: boolean
  error?: string
  nameError?: string
  onEditName: (name: string) => void
  onEditBio: (bio: string) => void
  onBack: () => void
  onSkip: () => void
  onSave: () => void
}

export function OnboardingProfile({
  initialName,
  name,
  bio,
  interests,
  isSaving,
  error,
  nameError,
  onEditName,
  onEditBio,
  onBack,
  onSkip,
  onSave,
}: OnboardingProfileProps) {
  const bioInput = useRef<HTMLTextAreaElement>(null)
  const [index, setIndex] = useState(0)
  const [replacement, setReplacement] = useState<string>()
  const [feedback, setFeedback] = useState("")
  const displayName = name.trim() || initialName
  const suggestions = useMemo(
    () =>
      createBioSuggestions({
        displayName,
        activityNames: interests.map(({ name: interestName }) => interestName),
      }),
    [displayName, interests],
  )
  const suggestion = suggestions[index]

  function browse(direction: -1 | 1) {
    setIndex((current) => nextBioSuggestionIndex(current, direction, suggestions.length))
    setReplacement(undefined)
    setFeedback("")
  }

  function applySuggestion(text: string) {
    onEditBio(text)
    setReplacement(undefined)
    setFeedback("Návrh je v poli O mně. Teď ho můžeš upravit.")
    requestAnimationFrame(() => bioInput.current?.focus())
  }

  return (
    <div className="space-y-4">
      <section className="flex items-center gap-4 rounded-2xl border border-card-border bg-card p-4">
        <Avatar
          aria-hidden
          className="size-12 shrink-0 border border-tile-border"
        >
          <AvatarFallback className="bg-secondary font-semibold text-secondary-foreground">
            {initials(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor="onboarding-display-name">Jméno v profilu</Label>
          <Input
            id="onboarding-display-name"
            autoComplete="name"
            value={name}
            disabled={isSaving}
            maxLength={NAME_MAX_LENGTH}
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? "onboarding-name-error" : "onboarding-name-hint"}
            onChange={(event) => onEditName(event.target.value)}
            className="h-11 bg-background"
          />
          {nameError ? (
            <p
              id="onboarding-name-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {nameError}
            </p>
          ) : (
            <p
              id="onboarding-name-hint"
              className="text-xs text-muted-foreground"
            >
              Tak tě najdou ostatní členové.
            </p>
          )}
        </div>
      </section>

      {suggestion ? (
        <section
          aria-labelledby="onboarding-drafts-heading"
          className="space-y-3 rounded-2xl border border-tile-border bg-secondary p-4 text-secondary-foreground"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="onboarding-drafts-heading"
              className="font-semibold"
            >
              Jak začít
            </h2>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label="Předchozí návrh"
                disabled={isSaving}
                onClick={() => browse(-1)}
              >
                <ChevronLeft aria-hidden />
              </Button>
              <span
                id="onboarding-bio-catalog-count"
                aria-live="polite"
                aria-atomic
                className="min-w-14 text-center text-sm tabular-nums"
              >
                {index + 1} / {suggestions.length}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label="Další návrh"
                disabled={isSaving}
                onClick={() => browse(1)}
              >
                <ChevronRight aria-hidden />
              </Button>
            </div>
          </div>
          <p
            id="onboarding-bio-suggestion"
            className="min-h-14 leading-relaxed wrap-break-word"
          >
            {suggestion.text}
          </p>
          {replacement ? (
            <div className="space-y-2 rounded-lg border border-tile-border bg-card p-3 text-foreground">
              <p
                role="status"
                className="text-sm"
              >
                Chceš nahradit rozepsané „O mně“?
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="min-h-11"
                  disabled={isSaving}
                  onClick={() => applySuggestion(replacement)}
                >
                  Nahradit text
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={isSaving}
                  onClick={() => setReplacement(undefined)}
                >
                  Ponechat rozepsané
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              className="min-h-11 bg-card"
              onClick={() => {
                if (bio.trim() && bio !== suggestion.text) setReplacement(suggestion.text)
                else applySuggestion(suggestion.text)
              }}
            >
              <Check aria-hidden /> Použít tento text
            </Button>
          )}
          <span
            role="status"
            className="sr-only"
          >
            {feedback}
          </span>
        </section>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="onboarding-bio">O mně</Label>
        <Textarea
          ref={bioInput}
          id="onboarding-bio"
          maxLength={BIO_MAX_LENGTH}
          rows={4}
          value={bio}
          disabled={isSaving}
          onChange={(event) => {
            setReplacement(undefined)
            onEditBio(event.target.value)
          }}
          aria-describedby="onboarding-bio-visibility"
          className="rounded-xl bg-card text-base"
        />
        <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
          <p
            id="onboarding-bio-visibility"
            className="flex items-center gap-1.5"
          >
            <LockKeyhole
              aria-hidden
              className="size-3.5"
            />{" "}
            Text ve svém profilu uvidíš jen ty.
          </p>
          <span>
            {bio.length} / {BIO_MAX_LENGTH}
          </span>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 justify-self-start"
          disabled={isSaving}
          onClick={onBack}
        >
          <ArrowLeft aria-hidden /> Zpět
        </Button>
        <Button
          type="button"
          variant="link"
          className="min-h-11 justify-self-end sm:ml-auto"
          disabled={isSaving}
          onClick={onSkip}
        >
          Teď ne
        </Button>
        <Button
          type="button"
          className="col-span-2 min-h-11"
          disabled={isSaving}
          onClick={onSave}
        >
          {isSaving ? "Ukládám…" : "Uložit a ukázat akce"} <ArrowRight aria-hidden />
        </Button>
      </div>
    </div>
  )
}
