import { createFileRoute } from "@tanstack/react-router"

import { PageBand } from "@/components/PageBand/PageBand"
import { Seo } from "@/components/Seo"
import { PAGE } from "@/lib/pageLayout"

import { isSuperadmin } from "@/features/admin/api/adminApi"
import { AdminOverviewPage } from "@/features/admin/components/AdminOverviewPage"
import { useSession } from "@/features/auth/hooks/useSession"

export const Route = createFileRoute("/_ProtectedPages/sprava")({
  component: AdminRoute,
})

/** „Správa HobbyHubu“ (PO 26. 11.): only for the superadmin; the API refuses anyone else too. */
function AdminRoute() {
  const { user } = useSession()
  return (
    <>
      <Seo title="Správa HobbyHubu" />
      {user && isSuperadmin(user) ? (
        <AdminOverviewPage viewerId={user.id} />
      ) : (
        <>
          <PageBand
            variant="section"
            title="Správa HobbyHubu"
          />
          <div className={PAGE}>
            <p className="text-muted-foreground">Sem má přístup jen správce HobbyHubu.</p>
          </div>
        </>
      )}
    </>
  )
}
