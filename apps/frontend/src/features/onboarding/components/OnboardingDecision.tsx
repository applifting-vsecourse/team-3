import { useRef, type CSSProperties } from "react"
import { ArrowRight, Check, Heart } from "lucide-react"

import { activityPhoto } from "@/assets/activity-photos"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type { Activity, Locality } from "@/lib/catalog/catalogSchemas"

type DecisionProps = {
  interests: Activity[]
  locality: Locality
  isSaving: boolean
  error?: string
  onSave: () => void
  onClose: () => void
  onRestoreFocus: () => void
}

export function OnboardingDecision({
  interests,
  locality,
  isSaving,
  error,
  onSave,
  onClose,
  onRestoreFocus,
}: DecisionProps) {
  const title = useRef<HTMLHeadingElement>(null)
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !isSaving) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName="hh-wizard-overlay hh-wizard-overlay-raised"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          title.current?.focus({ preventScroll: true })
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onRestoreFocus()
        }}
        onEscapeKeyDown={(event) => {
          if (isSaving) event.preventDefault()
        }}
        onPointerDownOutside={(event) => event.preventDefault()}
        className="max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-xl gap-0 overflow-y-auto rounded-2xl border-card-border p-0 motion-reduce:animate-none"
      >
        <div className="space-y-4 bg-hero p-5 text-on-hero sm:p-6">
          <div className="hh-wizard-picked grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check
              aria-hidden
              className="size-6"
            />
          </div>
          <DialogTitle
            asChild
            className="type-title focus:outline-none"
          >
            <h2
              ref={title}
              tabIndex={-1}
            >
              Máš vybráno!
            </h2>
          </DialogTitle>
          <DialogDescription className="text-on-hero-muted">
            Ukážeme ti akce v okolí podle toho, co tě baví. Vybrané místo je {locality.name}.
          </DialogDescription>
          <ul
            aria-label="Tvoje zájmy"
            className="grid grid-cols-3 gap-2"
          >
            {interests.map((interest, index) => {
              const photo = activityPhoto(interest.slug)
              return (
                <li
                  key={interest.id}
                  style={{ "--ticket-delay": `${index * 70}ms` } as CSSProperties}
                  className="hh-wizard-ticket relative isolate flex aspect-square min-w-0 items-end overflow-hidden rounded-lg border border-on-hero/60 bg-hero-pattern p-2 text-xs leading-tight font-semibold sm:aspect-[5/4] sm:p-3 sm:text-sm"
                >
                  {photo ? (
                    <img
                      src={photo.src}
                      alt=""
                      className="absolute inset-0 -z-10 size-full object-cover"
                    />
                  ) : null}
                  <span
                    aria-hidden
                    className="absolute inset-0 -z-10 bg-linear-to-t from-foreground via-foreground/40 to-foreground/10"
                  />
                  <span className="wrap-break-word">{interest.name}</span>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="space-y-4 bg-card p-5 sm:p-6">
          <p className="text-sm text-muted-foreground">
            Lokalitu a zájmy můžeš kdykoli změnit v Můj profil.
          </p>
          {error ? (
            <p
              role="alert"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <Button
              type="button"
              className="min-h-11 whitespace-normal"
              disabled={isSaving}
              onClick={onSave}
            >
              {isSaving ? "Ukládám…" : "Uložit a ukázat akce"} <ArrowRight aria-hidden />
            </Button>
            <Button
              type="button"
              variant="link"
              className="min-h-11 px-0"
              disabled={isSaving}
              onClick={onClose}
            >
              Zpět k výběru
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function OnboardingExit({
  isSaving,
  error,
  onStay,
  onLeave,
  onRestoreFocus,
}: {
  isSaving: boolean
  error?: string
  onStay: () => void
  onLeave: () => void
  onRestoreFocus: () => void
}) {
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !isSaving) onStay()
      }}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName="hh-wizard-overlay hh-wizard-overlay-raised"
        onEscapeKeyDown={(event) => {
          if (isSaving) event.preventDefault()
        }}
        onPointerDownOutside={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onRestoreFocus()
        }}
        className="rounded-2xl border-card-border motion-reduce:animate-none"
      >
        <DialogTitle className="flex items-center gap-2">
          <Heart
            aria-hidden
            className="size-5 text-secondary-foreground"
          />
          Odejít z průvodce?
        </DialogTitle>
        <DialogDescription>
          Rozdělaný výběr se neuloží a průvodce se příště sám neotevře. Domovské místo i zájmy si
          můžeš později nastavit v profilu.
        </DialogDescription>
        {error ? (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            className="min-h-11"
            disabled={isSaving}
            onClick={onStay}
          >
            Zůstat v průvodci
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={isSaving}
            onClick={onLeave}
          >
            {isSaving ? "Odcházím…" : "Odejít bez uložení"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
