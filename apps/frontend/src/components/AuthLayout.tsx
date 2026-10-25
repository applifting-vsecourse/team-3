import type { ReactNode } from "react"

import { Header } from "@/components/Header/Header"
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
 * would be noise.
 */
export function AuthLayout({ title, description, children, footer, aside }: AuthLayoutProps) {
  return (
    <>
      <Header userMenu={null} />
      <main className="flex-1">
        <div
          className={cn(
            "mx-auto w-full px-4 py-16",
            aside
              ? "max-w-sm md:grid md:max-w-7xl md:grid-cols-[minmax(0,27.5rem)_minmax(0,1fr)] md:items-start md:gap-12 md:px-10 md:py-12"
              : "max-w-sm",
          )}
        >
          <section>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>

            <div className="mt-8">{children}</div>

            <p className="mt-6 text-sm text-muted-foreground">{footer}</p>
          </section>
          {aside ? <aside className="hidden md:block">{aside}</aside> : null}
        </div>
      </main>
    </>
  )
}
