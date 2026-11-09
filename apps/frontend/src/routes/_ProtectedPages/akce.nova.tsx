import { createFileRoute, useNavigate } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { PageBand } from "@/components/PageBand/PageBand"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useCatalog } from "@/hooks/useCatalog"
import { FORM, PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { useSession } from "@/features/auth/hooks/useSession"
import { announcePublished } from "@/features/events/components/announcePublished"
import { EventForm } from "@/features/events/components/EventForm"
import { useCreateEvent } from "@/features/events/hooks/useCreateEvent"
import { CatalogState } from "@/features/groups/components/CatalogState"

export const Route = createFileRoute("/_ProtectedPages/akce/nova")({
  component: NewEventPage,
})

/**
 * Figma D-01, D-01d (B-022). Only for a signed-in user (the protected layout sends
 * visitors to the login); without a verified e-mail the form gives way to
 * a note, as the API would refuse it anyway (B-011).
 */
function NewEventPage() {
  const navigate = useNavigate()
  const { user } = useSession()
  const { catalog, queries } = useCatalog()
  const createEvent = useCreateEvent()

  return (
    <>
      <Seo title="Nová akce" />
      <PageBand
        title="Nová akce"
        description={"Napiš, co, kdy a kde. Lidi se pak přidají sami."}
        back={{ to: ROUTES.events, fallbackLabel: "Akce", label: "Akce" }}
        isCompactOnMobile
      />
      <div className={cn(PAGE, "gap-4")}>
        <div className={FORM}>
          {user && !user.emailVerified ? (
            <Alert>
              <AlertTitle>Nejdřív si ověř e-mail</AlertTitle>
              <AlertDescription>
                Akci můžeš založit, až e-mail ověříš. Odkaz jsme poslali na {user.email}, nový si
                pošli z pruhu nahoře.
              </AlertDescription>
            </Alert>
          ) : catalog ? (
            <EventForm
              catalog={catalog}
              isSubmitting={createEvent.isPending}
              errorMessage={createEvent.error?.message}
              onSubmit={(input) =>
                createEvent.mutate(input, {
                  onSuccess: (event) => {
                    // the detail as before; the toast leads on to Moje akce › Pořádám (#188)
                    announcePublished()
                    // replace: „Zpět“ from the new event goes where the user came from, not to an empty form
                    void navigate({
                      to: ROUTES.eventDetail,
                      params: { eventId: event.id },
                      replace: true,
                    })
                  },
                })
              }
            />
          ) : (
            <CatalogState queries={queries} />
          )}
        </div>
      </div>
    </>
  )
}
