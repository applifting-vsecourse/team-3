import { createFileRoute } from "@tanstack/react-router"

import { ComingSoon } from "@/components/ComingSoon"
import { Seo } from "@/components/Seo"

export const Route = createFileRoute("/_ProtectedPages/profil")({
  component: ProfilePage,
})

function ProfilePage() {
  return (
    <>
      <Seo title="Profil" />
      <ComingSoon title="Profil" />
    </>
  )
}
