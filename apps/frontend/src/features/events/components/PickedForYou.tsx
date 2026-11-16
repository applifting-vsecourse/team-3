import { useId, useState } from "react"
import type { LinkProps } from "@tanstack/react-router"

import { MoreLink, SectionHeading } from "@/components/HomeSection/HomeSection"
import { LogoMark } from "@/components/Logo/Logo"
import { BandTabs, BandTabsItem } from "@/components/PageBand/BandTabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"

import type { PublicEvent } from "@/features/events/api/eventSchemas"
import { HomeEventGrid } from "@/features/events/components/HomeEventGrid"

export type QuickPick = {
  key: string
  label: string
  /** What the pick is, under the tabs (Figma A-01pd). */
  description: string
  events: PublicEvent[]
  more: LinkProps
}

/**
 * „Pro tebe“ for a signed-in user (Figma A-01p, A-01pd): the quick picks as tabs over one
 * list, as on /akce — Tady chybíš first. Each pick is a section of GET /api/home, so an empty
 * one has no tab; the count in the pill is the cards under it (Figma: „počet sedí s kartami“).
 */
export function PickedForYou({ picks }: { picks: QuickPick[] }) {
  const headingId = useId()
  const [selected, setSelected] = useState(picks[0]?.key)
  // a refetch may drop the selected pick (its last event got full): fall back to the first
  const active = picks.find((pick) => pick.key === selected) ?? picks[0]
  if (!active) return null

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 md:gap-7"
    >
      <Tabs
        value={active.key}
        onValueChange={setSelected}
        className="gap-3 md:gap-7"
      >
        <div className="flex flex-col gap-3">
          <SectionHeading
            before="Pro "
            keyword="tebe"
            id={headingId}
          />
          <div className="flex items-center gap-3">
            <LogoMark className="size-6.5 md:size-9" />
            <BandTabs
              aria-label="Rychlé výběry"
              // the strip starts at the mark (its gap is the strip's padding) and a tab scrolled
              // past it fades out there instead of being cut beside the mark (#298); on a phone it
              // still runs to the screen's right edge
              className="-ms-3 min-w-0 flex-1 border-b border-input fade-start ps-3 md:-ms-3 md:me-auto md:flex-none md:ps-3 md:pe-1"
            >
              {picks.map((pick) => (
                <BandTabsItem
                  key={pick.key}
                  value={pick.key}
                  count={pick.events.length}
                  surface="page"
                >
                  {pick.label}
                </BandTabsItem>
              ))}
            </BandTabs>
          </div>
        </div>
        {picks.map((pick) => (
          <TabsContent
            key={pick.key}
            value={pick.key}
            className="flex flex-col gap-3 md:gap-7"
          >
            <div className="flex items-end justify-between gap-6">
              <p className="text-body text-muted-foreground md:type-intro">
                {pick.label}: {pick.description}
              </p>
              <MoreLink
                label="Zobrazit všechny"
                link={pick.more}
                className="hidden shrink-0 md:inline"
              />
            </div>
            <HomeEventGrid events={pick.events} />
            <MoreLink
              label="Zobrazit všechny"
              link={pick.more}
              className="md:hidden"
            />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  )
}
