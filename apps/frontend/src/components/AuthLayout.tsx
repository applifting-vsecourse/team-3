import type { ReactNode } from "react"

import type { BackLinkProps } from "@/components/BackLink/BackLink"
import { Header } from "@/components/Header/Header"
import { PageBand } from "@/components/PageBand/PageBand"
import { cn } from "@/lib/utils"

type AuthLayoutProps = {
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
  /**
   * Visible from tablet widths, beside the form when both columns have room
   * (Figma B-01d, B-03d: the nearest events). A slot, as
   * `components/` doesn't import from `features/`.
   */
  aside?: ReactNode
  /** Back to where the user came from — the event, the group, the list (#370, N9). */
  back?: Omit<BackLinkProps, "isIconOnlyOnMobile">
}

/**
 * Sign-in / sign-up pages keep the app chrome — they are pages of this app,
 * not a separate island. No card: the form sits on the page like any content.
 * The header omits the auth menu here; offering "Sign in" on the sign-in page
 * would be noise. The title and the line sit in the band on desktop; a phone
 * starts with the title on the page (Figma B-03).
 */
export function AuthLayout({ title, description, children, footer, aside, back }: AuthLayoutProps) {
  return (
    <>
      <Header userMenu={null} />
      <main className="flex-1">
        <PageBand
          title={title}
          description={description}
          back={back}
          isPlainOnMobile
        />
        <div
          className={cn(
            "mx-auto w-full px-4 pt-6 pb-16 md:pt-8",
            aside
              ? "max-w-sm md:max-w-xl md:pb-12 lg:grid lg:max-w-7xl lg:grid-cols-[minmax(0,27.5rem)_minmax(0,1fr)] lg:items-start lg:gap-12 lg:px-10"
              : "max-w-sm md:max-w-7xl md:px-10",
          )}
        >
          <section className={cn(!aside && "md:max-w-sm")}>
            {children}
            <p className="mt-6 text-sm text-muted-foreground">{footer}</p>
          </section>
          {aside ? <aside className="mt-8 hidden min-w-0 md:block lg:mt-0">{aside}</aside> : null}
        </div>
      </main>
    </>
  )
}
