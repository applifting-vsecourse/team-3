import { Button } from "@/components/ui/button"

export function ProfileLoading() {
  return (
    <p
      role="status"
      className="py-6 text-sm text-muted-foreground"
    >
      Načítám profil…
    </p>
  )
}
export function ProfileError({ retry }: { retry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 py-6"
    >
      <p className="text-sm text-destructive">
        Údaje se nepodařilo načíst. Zkontroluj připojení a zkus to znovu.
      </p>
      <Button
        variant="outline"
        onClick={retry}
      >
        Zkusit znovu
      </Button>
    </div>
  )
}
