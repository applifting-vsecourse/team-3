import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useCatalog } from "@/hooks/useCatalog"

import { useSession } from "@/features/auth/hooks/useSession"
import { EventForm } from "@/features/events/components/EventForm"
import { useCreateEvent } from "@/features/events/hooks/useCreateEvent"
import { CatalogState } from "@/features/groups/components/CatalogState"

export const Route = createFileRoute("/_ProtectedPages/akce/nova")({
  component: NewEventPage,
})

/**
 * Figma D-01 (B-022). Only for a signed-in user (the protected layout sends
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
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Nová akce</h1>
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
                  toast.success("Akce je zveřejněná.")
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
    </>
  )
}
