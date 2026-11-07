import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import type { ROUTES } from "@/app/routes"
import { PageBand } from "@/components/PageBand/PageBand"
import { PAGE } from "@/lib/pageLayout"

type LegalArticleProps = {
  title: string
  lead: string
  children: ReactNode
  /** The other of the two pages, linked at the end. */
  seeAlso: { to: typeof ROUTES.terms | typeof ROUTES.privacy; label: string }
}

/**
 * The pages behind the sign-up's consents (#153): text to read, so one
 * column of reading width (DESIGN.md › Layout), no cards. The title and the lead sit in the
 * band like on any page.
 */
export function LegalArticle({ title, lead, children, seeAlso }: LegalArticleProps) {
  return (
    <main className="flex-1">
      <PageBand
        title={title}
        description={lead}
      />
      <div className={PAGE}>
        <article className="flex max-w-2xl flex-col gap-8">
          {children}
          <p className="text-sm text-muted-foreground">
            Platí od 26. 10. 2026. Viz také{" "}
            <Link
              to={seeAlso.to}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {seeAlso.label}
            </Link>
            .
          </p>
        </article>
      </div>
    </main>
  )
}

type LegalSectionProps = {
  title: string
  children: ReactNode
}

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

/** A plain bulleted list; the kit has none. */
export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2 pl-6">{children}</ul>
}
