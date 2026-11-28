import { toast } from "sonner"

/**
 * After „Zveřejnit“ the page still opens the new event's detail (Figma D-01); the toast says
 * it is published and where it is now: Moje akce › Pořádám (#188). Text only, no button (PO
 * 26. 11.: toasts with buttons); the detail says the same for its organizer (MyEventsNote).
 *
 * `imageError`: the event is published but its image (#77) didn't upload — a second toast
 * says why and where to add it.
 */
export function announcePublished(imageError?: string | null): void {
  if (imageError) {
    toast.error(`Obrázek se nenahrál. ${imageError} Přidat ho můžeš v úpravě akce.`, {
      duration: 10_000,
    })
  }
  toast.success("Akce je zveřejněná.", {
    description: "Najdeš ji v Moje akce › Pořádám.",
  })
}
