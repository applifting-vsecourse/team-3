import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Loader2, RefreshCw, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { PageBand } from "@/components/PageBand/PageBand"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { adminOverviewQueryOptions } from "@/features/admin/api/adminApi"
import { useUnblockUser } from "@/features/admin/hooks/useModerateUser"

const dateFormat = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: "Europe/Prague",
  day: "numeric",
  month: "numeric",
  year: "numeric",
})

/**
 * „Správa HobbyHubu“ (PO 26. 11.: „Superadmin nemá nikde žádnou sekci v menu“): the
 * superadmin's own page, from the user menu. What is deactivated and who is blocked, with the
 * reasons, and the way back: the detail of an event (Obnovit is there, #308) and „Odblokovat“.
 * Deactivating an event and blocking a user happen where the superadmin finds them: on the
 * event's detail and the user's profile.
 */
export function AdminOverviewPage({ viewerId }: { viewerId: string }) {
  const query = useQuery(adminOverviewQueryOptions(viewerId))
  const unblock = useUnblockUser()
  const overview = query.data

  return (
    <>
      <PageBand
        variant="section"
        title="Správa HobbyHubu"
        description="Deaktivované akce a zablokovaní uživatelé. Akci deaktivuješ na jejím detailu, uživatele zablokuješ na jeho profilu."
      />
      <div className={cn(PAGE, "gap-10")}>
        {query.error ? (
          <Alert variant="destructive">
            <AlertTitle>Správu se nepodařilo načíst</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>Zkontroluj připojení a zkus to znovu.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void query.refetch()}
              >
                <RefreshCw className="size-4" />
                Zkusit znovu
              </Button>
            </AlertDescription>
          </Alert>
        ) : !overview ? (
          <div
            className="flex flex-col gap-3"
            aria-busy
            aria-label="Načítám správu"
          >
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            <section
              aria-labelledby="admin-hidden-events"
              className="flex flex-col gap-3"
            >
              <h2
                id="admin-hidden-events"
                className="type-card-heading"
              >
                Deaktivované akce ({overview.hiddenEvents.length})
              </h2>
              {overview.hiddenEvents.length === 0 ? (
                <p className="text-muted-foreground">Žádná akce není deaktivovaná.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {overview.hiddenEvents.map((event) => (
                    <li
                      key={event.id}
                      className="flex flex-col gap-1 py-3"
                    >
                      <Link
                        to={ROUTES.eventDetail}
                        params={{ eventId: event.id }}
                        className="w-fit font-semibold underline-offset-4 hover:underline"
                      >
                        {event.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {event.hiddenAt
                          ? `Deaktivováno ${dateFormat.format(event.hiddenAt)}`
                          : "Deaktivováno"}
                        {event.reason ? ` · ${event.reason}` : null}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section
              aria-labelledby="admin-blocked-users"
              className="flex flex-col gap-3"
            >
              <h2
                id="admin-blocked-users"
                className="type-card-heading"
              >
                Zablokovaní uživatelé ({overview.blockedUsers.length})
              </h2>
              {overview.blockedUsers.length === 0 ? (
                <p className="text-muted-foreground">Nikdo není zablokovaný.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {overview.blockedUsers.map((user) => (
                    <li
                      key={user.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <div className="flex min-w-0 flex-col gap-1">
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Zablokováno {dateFormat.format(user.blockedAt)}
                          {user.reason ? ` · ${user.reason}` : null}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        disabled={unblock.isPending}
                        aria-label={`Odblokovat uživatele ${user.name}`}
                        onClick={() =>
                          unblock.mutate(user.id, {
                            onSuccess: () => toast.success("Účet je odblokovaný."),
                            onError: (error) => toast.error(error.message),
                          })
                        }
                      >
                        {unblock.isPending && unblock.variables === user.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ShieldCheck />
                        )}
                        Odblokovat
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </>
  )
}
