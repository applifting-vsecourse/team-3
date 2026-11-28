import { useId, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { RefreshCw, Search } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { ChipTabs, ChipTabsItem } from "@/components/FilterChip/ChipTabs"
import { PageBand } from "@/components/PageBand/PageBand"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { friendListsQueryOptions } from "@/features/friends/api/friendsQueryOptions"
import type { FriendLists } from "@/features/friends/api/friendsSchemas"
import { FriendRequestRow, FriendRow, ROWS } from "@/features/friends/components/FriendRows"
import { initialFriendsTab, matchesName, type FriendsTab } from "@/features/friends/lib/friends"

export const NO_ONE_YET = "Zatím tu nikoho nemáš. Přátele si přidáš na jejich profilu."

/**
 * /profil/pratele „Lidé, které znám“ (Figma B-09, B-09a, B-09b and desktops, #307): the chips
 * Přátelé · n / Žádosti · n (the requests waiting for me), each in the URL. Without `?tab` the
 * page picks once (`initialFriendsTab`), so a request answered here doesn't move the user. The
 * friends by name with a search that filters in the browser; the rows lead to the profiles,
 * where a friend is removed.
 */
export function FriendsPage({
  viewerId,
  urlTab,
  onTabChange,
  onRequestDecided,
}: {
  viewerId: string
  urlTab: FriendsTab | undefined
  onTabChange: (tab: FriendsTab) => void
  /** After a request is accepted, rejected or cancelled: the route refreshes the bell (#430). */
  onRequestDecided?: () => Promise<unknown>
}) {
  const query = useQuery(friendListsQueryOptions(viewerId))
  const lists = query.data
  const [picked, setPicked] = useState<FriendsTab>()
  // React's „storing information from previous renders“: picked once, when the lists first come
  if (picked === undefined && lists) setPicked(initialFriendsTab(lists))
  const tab = urlTab ?? picked

  return (
    <>
      <Seo title="Lidé, které znám" />
      <PageBand
        title="Lidé, které znám"
        description="Přátelé a žádosti o přátelství."
        back={{ to: ROUTES.profile, fallbackLabel: "Můj profil", label: "Můj profil" }}
        // a page under the profile: on a phone one bar with the arrow and the title (Header/Sub)
        isCompactOnMobile
      />
      <div className={cn(PAGE, "gap-5 pb-24")}>
        {query.error ? (
          <FriendsError onRetry={() => void query.refetch()} />
        ) : !lists || !tab ? (
          <FriendsLoading />
        ) : (
          <Tabs
            value={tab}
            onValueChange={(value) => onTabChange(value === "zadosti" ? "zadosti" : "pratele")}
            className="gap-5"
          >
            <ChipTabs aria-label="Lidé, které znám">
              <ChipTabsItem
                value="pratele"
                count={lists.friends.length}
              >
                Přátelé
              </ChipTabsItem>
              <ChipTabsItem
                value="zadosti"
                count={lists.incoming.length}
              >
                Žádosti
              </ChipTabsItem>
            </ChipTabs>
            <TabsContent value="pratele">
              <Friends friends={lists.friends} />
            </TabsContent>
            <TabsContent value="zadosti">
              <Requests
                lists={lists}
                onDecided={onRequestDecided}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  )
}

function Friends({ friends }: { friends: FriendLists["friends"] }) {
  const [text, setText] = useState("")
  if (friends.length === 0) return <Empty>{NO_ONE_YET}</Empty>
  const found = friends.filter((person) => matchesName(person, text))
  return (
    <div className="flex flex-col gap-4">
      <div
        role="search"
        className="relative w-full md:max-w-105"
      >
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-label="Hledat mezi přáteli"
          placeholder="Jméno"
          maxLength={100}
          // 16 px on phones, or iOS zooms in
          className="pl-9 text-base md:text-sm"
        />
      </div>
      {found.length === 0 ? (
        <Empty>Nikoho takového mezi přáteli nemáš. Přátele si přidáš na jejich profilu.</Empty>
      ) : (
        <ul
          aria-label="Přátelé"
          className={ROWS}
        >
          {found.map((person) => (
            <FriendRow
              key={person.id}
              person={person}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function Requests({
  lists,
  onDecided,
}: {
  lists: FriendLists
  onDecided?: () => Promise<unknown>
}) {
  if (lists.incoming.length + lists.outgoing.length === 0) {
    return <Empty>Žádné žádosti o přátelství.</Empty>
  }
  return (
    <div className="flex flex-col gap-6">
      {lists.incoming.length > 0 ? (
        <RequestSection title={`Příchozí (${lists.incoming.length})`}>
          {lists.incoming.map((request) => (
            <FriendRequestRow
              key={request.person.id}
              request={request}
              direction="incoming"
              onDecided={onDecided}
            />
          ))}
        </RequestSection>
      ) : null}
      {lists.outgoing.length > 0 ? (
        <RequestSection title={`Odeslané (${lists.outgoing.length})`}>
          {lists.outgoing.map((request) => (
            <FriendRequestRow
              key={request.person.id}
              request={request}
              direction="outgoing"
              onDecided={onDecided}
            />
          ))}
        </RequestSection>
      ) : null}
    </div>
  )
}

function RequestSection({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-1"
    >
      <h2
        id={headingId}
        className="text-body font-semibold"
      >
        {title}
      </h2>
      <ul className={ROWS}>{children}</ul>
    </section>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

function FriendsLoading() {
  return (
    <div
      role="status"
      aria-label="Načítám lidi, které znáš"
      className="flex flex-col gap-3"
    >
      <Skeleton className="h-9 w-48" />
      {[0, 1, 2].map((i) => (
        <Skeleton
          key={i}
          className="h-14"
        />
      ))}
    </div>
  )
}

export function FriendsError({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Lidi, které znáš, se nepodařilo načíst</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-3">
        <span>Zkontroluj připojení a zkus to znovu.</span>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
        >
          <RefreshCw className="size-4" />
          Zkusit znovu
        </Button>
      </AlertDescription>
    </Alert>
  )
}
