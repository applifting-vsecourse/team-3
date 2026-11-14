import { useNavigate } from "@tanstack/react-router"

/**
 * Where a founded, edited or deactivated group goes (#187, #242): its detail replaces
 * the form or the management, as after publishing an event, so „Zpět“ on the detail
 * leads where the user came from and not back to the submitted form or to the
 * management of a deactivated group.
 */
export function useOpenSavedGroup() {
  const navigate = useNavigate()
  return (groupId: string) =>
    void navigate({ to: "/skupiny/$groupId", params: { groupId }, replace: true })
}
