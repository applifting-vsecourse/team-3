import { createFileRoute } from "@tanstack/react-router"

import { ComingSoon } from "@/components/ComingSoon"
import { Header } from "@/components/Header/Header"
import { Seo } from "@/components/Seo"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"

export const Route = createFileRoute("/skupiny")({
  component: GroupsPage,
})

function GroupsPage() {
  return (
    <>
      <Seo title="Skupiny" />
      <Header userMenu={<HeaderMenu />} />
      <main className="min-h-svh">
        <ComingSoon title="Skupiny" />
      </main>
    </>
  )
}
