import { useId, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"

import { ROUTES } from "@/app/routes"
import { PageBand } from "@/components/PageBand/PageBand"
import { Seo } from "@/components/Seo"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { profileQueryOptions } from "@/features/profile/api/profileQueryOptions"
import type { SelfProfile } from "@/features/profile/api/profileSchemas"

import { ProfileForm } from "./ProfileForm"
import { ProfileError, ProfileLoading } from "./ProfileState"

type ProfileEditPageProps = {
  viewerId: string
  /** Účet: the password and e-mail forms of the auth feature (the route puts them in). */
  accountContent: (profile: SelfProfile) => ReactNode
  /** After saving: what else shows the name or interests refreshes. */
  onSaved: () => Promise<void>
}

/**
 * /profil/upravit (Figma B-06, B-06d): Údaje and Účet side by side on desktop,
 * one under the other on a phone, under the band with the way back to the profile.
 */
export function ProfileEditPage({ viewerId, accountContent, onSaved }: ProfileEditPageProps) {
  const query = useQuery(profileQueryOptions(viewerId))
  return (
    <>
      <Seo title="Upravit profil" />
      <PageBand
        title="Upravit profil"
        description="Jak tě uvidí ostatní a jak se přihlašuješ."
        back={{ to: ROUTES.profile, fallbackLabel: "Můj profil", label: "Můj profil" }}
        // a form: on a phone one bar with the arrow and the title (Figma Header/Sub)
        isCompactOnMobile
      />
      <div className={cn(PAGE, "gap-6 pb-24")}>
        {query.error ? (
          <ProfileError retry={() => void query.refetch()} />
        ) : !query.data ? (
          <ProfileLoading />
        ) : (
          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            <Column title="Údaje">
              <ProfileForm
                profile={query.data}
                onSaved={onSaved}
              />
            </Column>
            <Column title="Účet">{accountContent(query.data)}</Column>
          </div>
        )}
      </div>
    </>
  )
}

function Column({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-6"
    >
      <h2
        id={headingId}
        className="type-feature"
      >
        {title}
      </h2>
      {children}
    </section>
  )
}
