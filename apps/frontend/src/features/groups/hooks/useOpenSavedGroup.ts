import { useNavigate } from "@tanstack/react-router"

/**
 * Where a founded or edited group goes (#187): its detail replaces the form,
 * as after publishing an event, so „Zpět“ on the detail leads where the user
 * came from and not back to the submitted form.
 */
export function useOpenSavedGroup() {
  const navigate = useNavigate()
  return (groupId: string) =>
    void navigate({ to: "/skupiny/$groupId", params: { groupId }, replace: true })
}
