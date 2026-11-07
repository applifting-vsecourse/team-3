import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink/BackLink"
import { Seo } from "@/components/Seo"
import { useCatalog } from "@/hooks/useCatalog"
import { FORM, PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { EventForm } from "@/features/events/components/EventForm"
import { useCreateEvent } from "@/features/events/hooks/useCreateEvent"
import { CatalogState } from "@/features/groups/components/CatalogState"

export const Route = createFileRoute("/_ProtectedPages/akce/nova")({
  component: NewEventPage,
})

/**
 * Figma D-01, D-01d (B-022). Only for a signed-in user (the protected layout sends
 * visitors to the login), who is verified: an unverified e-mail can't sign in
 * (#236). An old session gets the API's 403 as the form's error.
 */
function NewEventPage() {
  const navigate = useNavigate()
  const { catalog, queries } = useCatalog()
  const createEvent = useCreateEvent()

  return (
    <>
      <Seo title="Nová akce" />
      <div className={cn(PAGE, "gap-4")}>
        <BackLink
          to={ROUTES.events}
          fallbackLabel="Akce"
          label="Akce"
        />
        <div className={FORM}>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Nová akce</h1>
          {catalog ? (
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
      </div>
    </>
  )
}
