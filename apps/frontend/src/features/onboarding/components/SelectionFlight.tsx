import type { CSSProperties } from "react"
import { createPortal } from "react-dom"

import { activityPhoto } from "@/assets/activity-photos"

export type PhotoFlight = {
  id: string
  src: string
  left: number
  top: number
  x: number
  y: number
}

export function photoFlight(
  id: string,
  slug: string,
  card: HTMLElement,
  slot: HTMLElement | null,
): PhotoFlight | undefined {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !slot) return undefined
  const photo = activityPhoto(slug)
  if (!photo) return undefined

  const from = card.getBoundingClientRect()
  const to = slot.getBoundingClientRect()
  if (!from.width || !to.width || to.top >= window.innerHeight) return undefined
  const x = from.left + from.width / 2
  const y = from.top + from.height / 2
  return {
    id,
    src: photo.src,
    left: x - 32,
    top: y - 32,
    x: to.left + to.width / 2 - x,
    y: to.top + to.height / 2 - y,
  }
}

export function SelectionFlight({ flight, onEnd }: { flight?: PhotoFlight; onEnd: () => void }) {
  if (!flight) return null
  const style = {
    left: flight.left,
    top: flight.top,
    "--travel-x": `${flight.x}px`,
    "--travel-y": `${flight.y}px`,
  } as CSSProperties

  return createPortal(
    <img
      key={flight.id}
      src={flight.src}
      alt=""
      aria-hidden
      onAnimationEnd={onEnd}
      className="hh-wizard-flight pointer-events-none fixed z-[70] size-16 rounded-lg border-2 border-primary object-cover shadow-lg motion-reduce:hidden"
      style={style}
    />,
    document.body,
  )
}
