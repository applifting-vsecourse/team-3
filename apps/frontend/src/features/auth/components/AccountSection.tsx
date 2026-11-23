import { useId } from "react"
import { useQuery } from "@tanstack/react-query"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import { accountSummaryQueryOptions } from "@/features/auth/api/accountApi"
import { useDownloadMyData } from "@/features/auth/hooks/useAccountActions"

import { DeleteAccountDialog } from "./DeleteAccountDialog"

/**
 * „Můj účet“ on Můj profil (B-080, #64): the data to take along, then the way out,
 * as Strava's and GitHub's account pages have them — download first, delete
 * under it. A section of the page, no card (DESIGN.md › Layout).
 */
export function AccountSection({ viewerId }: { viewerId: string }) {
  const headingId = useId()
  const summary = useQuery(accountSummaryQueryOptions(viewerId))
  const download = useDownloadMyData()
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-6"
    >
      <h2
        id={headingId}
        className="type-feature"
      >
        Můj <span className="highlight-keyword">účet</span>
      </h2>
      <div className="flex flex-col gap-3">
        <h3 className="text-body font-semibold">Moje data</h3>
        <p className="text-sm text-muted-foreground">
          Profil, akce, skupiny, hodnocení, přátelé a upozornění v jednom souboru JSON.
        </p>
        <Button
          variant="outline"
          className="self-start"
          disabled={download.isPending}
          onClick={() =>
            download.mutate(undefined, {
              onError: (error) => toast.error(error.message),
            })
          }
        >
          {download.isPending ? <Loader2 className="animate-spin" /> : <Download />}
          Stáhnout moje data
        </Button>
      </div>
      <Separator />
      <div className="flex flex-col gap-3">
        <h3 className="text-body font-semibold">Smazání účtu</h3>
        <p className="text-sm text-muted-foreground">
          Smaže profil a přihlášení. Proběhlé akce a hodnocení zůstanou pod jménem „Smazaný
          uživatel“.
        </p>
        {summary.error ? (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3"
          >
            <p className="text-sm text-destructive">
              Údaje o účtu se nepodařilo načíst. Zkontroluj připojení a zkus to znovu.
            </p>
            <Button
              variant="outline"
              onClick={() => void summary.refetch()}
            >
              Zkusit znovu
            </Button>
          </div>
        ) : !summary.data ? (
          <p
            role="status"
            className="text-sm text-muted-foreground"
          >
            Načítám údaje o účtu…
          </p>
        ) : (
          <DeleteAccountDialog summary={summary.data} />
        )}
      </div>
    </section>
  )
}
