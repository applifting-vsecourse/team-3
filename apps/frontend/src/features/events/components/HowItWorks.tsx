import { useId } from "react"

import { LogoMark } from "@/components/Logo/Logo"

const STEPS = [
  {
    label: "1 · Najdi",
    title: "Najdi, kde chybí jeden",
    text: "Akce podle místa, termínu a aktivity. Limetková = tam do minima chybí lidi.",
    picture: "mark",
  },
  {
    label: "2 · Přihlas se",
    title: "Ten jeden jsi ty",
    text: "Účet stačí e-mail a heslo. Na akci se přihlásíš jedním tlačítkem, někde počkáš na schválení.",
    picture: "you",
  },
  {
    label: "3 · Přijď",
    title: "Parta je kompletní",
    text: "Jakmile se sejde minimum, akce se koná. Zbytek je na hřišti, u stolu nebo na trase.",
    picture: "full",
  },
] as const

/**
 * „Jak to funguje“ for a visitor (Figma A-01, A-01d): the dark green band as a block, three
 * steps as the logo's story — the mark missing one, the lime „ty“, the full group — joined by
 * a dashed lime line (across on desktop, down on a phone).
 */
export function HowItWorks() {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className="relative flex flex-col gap-7 overflow-hidden rounded-2xl border border-band-edge on-hero px-5 py-7 md:gap-11 md:p-14"
    >
      <CornerDots />
      <div className="relative flex flex-col gap-2">
        <h2
          id={headingId}
          className="type-title text-on-hero"
        >
          Jak to <span className="text-primary">funguje</span>
        </h2>
        <p className="text-body text-on-hero-muted md:type-intro">
          Od „někde chybí jeden“ k „akce se koná“ ve třech krocích.
        </p>
      </div>
      {/* the numbers stay readable: Safari drops list semantics with list-style: none */}
      <ol className="relative flex flex-col gap-7 md:flex-row md:gap-10">
        {STEPS.map((step, index) => (
          <li
            key={step.label}
            className="relative flex flex-1 gap-4 md:flex-col md:gap-5"
          >
            {index < STEPS.length - 1 ? (
              <span
                aria-hidden
                className="absolute top-16 bottom-0 left-7 border-l-2 border-dashed border-primary md:top-11 md:right-4 md:bottom-auto md:left-26 md:border-t-2 md:border-l-0"
              />
            ) : null}
            <StepPicture picture={step.picture} />
            <div className="flex flex-1 flex-col gap-1.5">
              <p className="type-step text-primary">{step.label}</p>
              <h3 className="type-card-heading text-on-hero">{step.title}</h3>
              <p className="text-body text-on-hero-muted">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function StepPicture({ picture }: { picture: (typeof STEPS)[number]["picture"] }) {
  return (
    <div className="flex size-14 shrink-0 items-center justify-center md:size-22">
      {picture === "you" ? (
        <span className="flex size-9 items-center justify-center rounded-full bg-primary font-heading text-body font-extrabold text-primary-foreground md:size-14 md:text-2xl">
          ty
        </span>
      ) : (
        <LogoMark
          isOnHero
          isFull={picture === "full"}
          className="size-14 md:size-22"
        />
      )}
    </div>
  )
}

/** The logo's faint dots in the top-right corner (Figma › Motiv loga). Decoration. */
function CornerDots() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 360 360"
      className="pointer-events-none absolute -top-12 -right-14 size-50 md:-top-22 md:-right-12 md:size-90"
    >
      <circle
        cx="80"
        cy="80"
        r="80"
        className="fill-hero-pattern"
      />
      <circle
        cx="280"
        cy="80"
        r="80"
        className="fill-hero-pattern"
      />
      <circle
        cx="80"
        cy="280"
        r="80"
        className="fill-hero-pattern"
      />
      <circle
        cx="280"
        cy="280"
        r="80"
        className="fill-hero-pattern"
      />
    </svg>
  )
}
