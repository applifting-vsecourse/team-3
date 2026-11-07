import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { AppHeader } from "@/features/auth/components/AppHeader"
import { TermsOfUse } from "@/features/legal/components/TermsOfUse"

// linked from the sign-up's consent (#153)
export const Route = createFileRoute("/podminky")({
  component: TermsPage,
})

function TermsPage() {
  return (
    <>
      <Seo title="Podmínky užívání" />
      <AppHeader />
      <TermsOfUse />
    </>
  )
}
