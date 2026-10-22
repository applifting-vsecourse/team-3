import { createFileRoute } from "@tanstack/react-router"

import { ComingSoon } from "@/components/ComingSoon"
import { Header } from "@/components/Header/Header"
import { Seo } from "@/components/Seo"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"

export const Route = createFileRoute("/akce")({
  component: EventsPage,
})

function EventsPage() {
  return (
    <>
      <Seo title="Akce" />
      <Header userMenu={<HeaderMenu />} />
      <main className="flex-1">
        <ComingSoon title="Akce" />
      </main>
    </>
  )
}
