import { createFileRoute, redirect } from "@tanstack/react-router"

import { myEventsSearchSchema } from "@/features/events/lib/myEvents"

/**
 * The old address of Moje akce (#44): since #304 it is Moje › Akce. Links in e-mails,
 * bookmarks and the history keep working, with the tab they asked for; /moje/akce asks for
 * the sign-in itself.
 */
export const Route = createFileRoute("/moje-akce")({
  validateSearch: myEventsSearchSchema,
  beforeLoad: ({ search }) => {
    // what the page came with goes along, e.g. the result of verifying the e-mail (#155)
    throw redirect({ to: "/moje/akce", search, replace: true, state: true })
  },
})
