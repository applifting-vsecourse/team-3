import type { ReactNode } from "react"

import { Header } from "@/components/Header/Header"
import { PageBand } from "@/components/PageBand/PageBand"
import { cn } from "@/lib/utils"

type AuthLayoutProps = {
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
  /**
   * Desktop only, beside the form (Figma B-01d, B-03d: the nearest events),
   * so the form isn't a small island on an empty page. A slot, as
   * `components/` doesn't import from `features/`.
   */
  aside?: ReactNode
}

/**
 * Sign-in / sign-up pages keep the app chrome — they are pages of this app,
 * not a separate island. No card: the form sits on the page like any content.
 * The header omits the auth menu here; offering "Sign in" on the sign-in page
 * would be noise. The title and the line sit in the band on desktop; a phone
 * starts with the title on the page (Figma B-03).
 */
export function AuthLayout({ title, description, children, footer, aside }: AuthLayoutProps) {
  return (
    <>
      <Header userMenu={null} />
      <main className="flex-1">
        <PageBand
          title={title}
          description={description}
          isPlainOnMobile
        />
        <div
          className={cn(
            "mx-auto w-full px-4 pt-6 pb-16 md:pt-8",
            aside
              ? "max-w-sm md:grid md:max-w-7xl md:grid-cols-[minmax(0,27.5rem)_minmax(0,1fr)] md:items-start md:gap-12 md:px-10 md:pb-12"
              : "max-w-sm md:max-w-7xl md:px-10",
          )}
        >
          <section className={cn(!aside && "md:max-w-sm")}>
            {children}
            <p className="mt-6 text-sm text-muted-foreground">{footer}</p>
          </section>
          {aside ? <aside className="hidden md:block">{aside}</aside> : null}
        </div>
      </main>
    </>
  )
}
