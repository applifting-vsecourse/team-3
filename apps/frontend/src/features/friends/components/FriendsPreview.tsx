import { useId, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { friendListsQueryOptions } from "@/features/friends/api/friendsQueryOptions"
import { FriendRequestRow, FriendRow, ROWS } from "@/features/friends/components/FriendRows"
import { FriendsError, NO_ONE_YET } from "@/features/friends/components/FriendsPage"

/** How many of each the preview shows (Figma B-05f, B-05fd; decided 18. 11.). */
const REQUESTS_SHOWN = 2
const FRIENDS_SHOWN_PHONE = 4
const FRIENDS_SHOWN = 6

/**
 * „Lidé, které znám“ on Můj profil (#307, Figma B-05f, B-05fd, B-05 · Stavy sekce): a preview —
 * the newest requests waiting for me with Odmítnout / Přijmout, my own requests only as a link,
 * the first friends by name — and the way to the whole list on /profil/pratele, shown only when
 * there is more to see there.
 */
export function FriendsPreview({ viewerId }: { viewerId: string }) {
  const query = useQuery(friendListsQueryOptions(viewerId))
  const headingId = useId()
  const lists = query.data
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4"
    >
      <h2
        id={headingId}
        className="type-feature"
      >
        Lidé, které <span className="highlight-keyword">znám</span>
      </h2>
      {query.error ? (
        <FriendsError onRetry={() => void query.refetch()} />
      ) : !lists ? (
        <div
          role="status"
          aria-label="Načítám lidi, které znáš"
          className="flex flex-col gap-3"
        >
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : (
        <>
          {lists.incoming.length > 0 ? (
            <Part title={`Žádosti o přátelství (${lists.incoming.length})`}>
              <ul className={ROWS}>
                {lists.incoming.slice(0, REQUESTS_SHOWN).map((request) => (
                  <FriendRequestRow
                    key={request.person.id}
                    request={request}
                    direction="incoming"
                  />
                ))}
              </ul>
            </Part>
          ) : null}
          {lists.incoming.length > REQUESTS_SHOWN || lists.outgoing.length > 0 ? (
            <div className="flex flex-wrap gap-x-2">
              {lists.incoming.length > REQUESTS_SHOWN ? (
                <MoreLink tab="zadosti">Všechny žádosti ({lists.incoming.length})</MoreLink>
              ) : null}
              {lists.outgoing.length > 0 ? (
                <MoreLink tab="zadosti">Odeslané žádosti ({lists.outgoing.length})</MoreLink>
              ) : null}
            </div>
          ) : null}
          {lists.friends.length === 0 ? (
            <p className="text-sm text-muted-foreground">{NO_ONE_YET}</p>
          ) : (
            <Part title={`Přátelé (${lists.friends.length})`}>
              <ul
                aria-label="Přátelé"
                className={ROWS}
              >
                {lists.friends.slice(0, FRIENDS_SHOWN).map((person, index) => (
                  <FriendRow
                    key={person.id}
                    person={person}
                    // a phone shows fewer, so the profile stays short (decided 18. 11.)
                    className={cn(index >= FRIENDS_SHOWN_PHONE && "max-md:hidden")}
                  />
                ))}
              </ul>
              {lists.friends.length > FRIENDS_SHOWN_PHONE ? (
                <MoreLink
                  tab="pratele"
                  // between 5 and 6 friends a desktop shows them all
                  className={cn(lists.friends.length <= FRIENDS_SHOWN && "md:hidden")}
                >
                  Všichni přátelé ({lists.friends.length})
                </MoreLink>
              ) : null}
            </Part>
          )}
        </>
      )}
    </section>
  )
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId()
  return (
    <div
      role="group"
      aria-labelledby={headingId}
      className="flex flex-col gap-1"
    >
      <h3
        id={headingId}
        className="text-body font-semibold"
      >
        {title}
      </h3>
      {children}
    </div>
  )
}

function MoreLink({
  tab,
  className,
  children,
}: {
  tab: "pratele" | "zadosti"
  className?: string
  children: ReactNode
}) {
  return (
    <Button
      asChild
      variant="ghost"
      className={cn("-ml-3 w-fit", className)}
    >
      <Link
        to={ROUTES.friends}
        search={{ tab }}
      >
        {children}
      </Link>
    </Button>
  )
}
