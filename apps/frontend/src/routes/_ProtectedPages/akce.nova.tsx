import { createFileRoute, useNavigate } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { PageBand } from "@/components/PageBand/PageBand"
import { Seo } from "@/components/Seo"
import { useCatalog } from "@/hooks/useCatalog"
import { useLocality } from "@/hooks/useLocality"
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
 * visitors to the login), who is verified: an unverified e-mail can't sign in
 * (#236). An old session gets the API's 403 as the form's error.
 */
function NewEventPage() {
  const navigate = useNavigate()
  const { catalog, queries } = useCatalog()
  const createEvent = useCreateEvent()
  // the locality the lists show, picked on /akce or the profile's home: the form starts there (QA-16);
  // a guess from the IP is often off (review #496), so it only centres the map. Never written to
  // the profile
  const { user, isPending } = useSession()
  const shown = useLocality(undefined, isPending ? undefined : (user?.id ?? null))
  const shownLocality = catalog?.localities.find(({ slug }) => slug === shown.slug)
  const startLocality = shown.source === "ip" ? undefined : shownLocality

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
          {/* the form takes its starting values once: it waits for the locality to be known */}
          {catalog && shown.slug !== undefined ? (
            <EventForm
              catalog={catalog}
              initialValues={startLocality ? { localityId: startLocality.id } : undefined}
              initialMapCenter={shownLocality}
              isSubmitting={createEvent.isPending}
              errorMessage={createEvent.error?.message}
              onSubmit={(input, image) =>
                createEvent.mutate(
                  { input, image: image.kind === "set" ? image.file : null },
                  {
                    onSuccess: ({ event, imageError }) => {
                      // the detail as before; the toast leads on to Moje akce › Pořádám (#188)
                      announcePublished(imageError)
                      // replace: „Zpět“ from the new event goes where the user came from, not to an empty form
                      void navigate({
                        to: ROUTES.eventDetail,
                        params: { eventId: event.id },
                        replace: true,
                      })
                    },
                  },
                )
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
