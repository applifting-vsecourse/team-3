import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"

import { Seo } from "@/components/Seo"
import { TabBar, TabBarItem } from "@/components/TabBar/TabBar"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { profileQueryOptions } from "@/features/profile/api/profileQueryOptions"
import type { SelfProfile } from "@/features/profile/api/profileSchemas"

import { ProfileForm } from "./ProfileForm"
import { ProfileEvents, ProfileRatings } from "./ProfileOverview"
import { ProfileError, ProfileLoading } from "./ProfileState"

type ProfilePageProps = {
  viewerId: string
  accountContent: (profile: SelfProfile) => ReactNode
  groupsContent: ReactNode
  onSaved: () => Promise<void>
}

export function ProfilePage(props: ProfilePageProps) {
  return (
    <>
      <Seo title="Můj profil" />
      <div className={cn(PAGE, "gap-6 pb-24")}>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Můj profil</h1>
        <ProfileContent {...props} />
      </div>
    </>
  )
}
function ProfileContent({ viewerId, accountContent, groupsContent, onSaved }: ProfilePageProps) {
  const query = useQuery(profileQueryOptions(viewerId))
  if (query.error) return <ProfileError retry={() => void query.refetch()} />
  if (!query.data) return <ProfileLoading />
  return (
    <Tabs
      defaultValue="udaje"
      className="gap-6"
    >
      <TabBar aria-label="Části mého profilu">
        <TabBarItem
          value="udaje"
          className="px-2"
        >
          Údaje
        </TabBarItem>
        <TabBarItem
          value="ucet"
          className="px-2"
        >
          Účet
        </TabBarItem>
        <TabBarItem
          value="prehled"
          className="px-2"
        >
          Přehled
        </TabBarItem>
        <TabBarItem
          value="hodnoceni"
          className="px-2"
        >
          Hodnocení
        </TabBarItem>
      </TabBar>
      <TabsContent value="udaje">
        <ProfileForm
          profile={query.data}
          onSaved={onSaved}
        />
      </TabsContent>
      <TabsContent value="ucet">{accountContent(query.data)}</TabsContent>
      <TabsContent value="prehled">
        <ProfileEvents
          viewerId={viewerId}
          groups={groupsContent}
        />
      </TabsContent>
      <TabsContent value="hodnoceni">
        <ProfileRatings viewerId={viewerId} />
      </TabsContent>
    </Tabs>
  )
}
