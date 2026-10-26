import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { AppHeader } from "@/features/auth/components/AppHeader"
import { PrivacyNotice } from "@/features/legal/components/PrivacyNotice"

// linked from the sign-up's consent (#153)
export const Route = createFileRoute("/ochrana-osobnich-udaju")({
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <>
      <Seo title="Zpracování osobních údajů" />
      <AppHeader />
      <main className={cn(PAGE, "flex-1")}>
        <PrivacyNotice />
      </main>
    </>
  )
}
