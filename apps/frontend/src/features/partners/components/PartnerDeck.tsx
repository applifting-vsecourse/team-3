import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type PointerEvent,
} from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { Undo2, UserPlus, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { REDUCED_MOTION_QUERY } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"

import { partnerDeckQueryOptions } from "@/features/partners/api/partnersQueryOptions"
import type { Partner, PartnerRadius } from "@/features/partners/api/partnersSchemas"
import {
  usePartnerRequest,
  usePartnerSkip,
  usePartnerUnskip,
} from "@/features/partners/hooks/usePartnerActions"
import {
  announce,
  DAILY_LIMIT_REACHED,
  deckQueue,
  emptyDeck,
  moveDeck,
  PREFETCH_WHEN_LEFT,
  requestsLeftLabel,
} from "@/features/partners/lib/partnerDeck"
import {
  BUTTON_FLING,
  CROSSFADE_MS,
  dragIntent,
  dragProgress,
  FLING_TILT_DEG,
  flingDurationMs,
  releaseDirection,
  SPRING_BACK_MS,
  tiltDeg,
  type SwipeDirection,
} from "@/features/partners/lib/partnerGesture"

import { PartnerCard } from "./PartnerCard"
import { PartnerMatch } from "./PartnerMatch"
import { PartnersEmpty, PartnersError, PartnersSetup } from "./PartnersEmpty"

import "./partners-motion.css"

const FLY_EASING = "cubic-bezier(0.16, 1, 0.3, 1)"
const SPRING_EASING = "cubic-bezier(0.34, 1.56, 0.64, 1)"
/** A double click must not skip two people: input waits this long after a commit. */
const INPUT_LOCK_MS = 200

type Drag = {
  pointerId: number
  x0: number
  y0: number
  dx: number
  dy: number
  /** px/ms, from the last two samples */
  vx: number
  t: number
  intent?: "drag" | "scroll"
}

/** Where the card flies from and to; the deck has moved on underneath already. */
type Leaving = {
  partner: Partner
  direction: SwipeDirection
  from: string
  to: string
  durationMs: number
  isFade: boolean
}

const isReducedMotion = () =>
  typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION_QUERY).matches

// a bonus where the browser has it (Android); never the only feedback (iOS has no API)
const buzz = (pattern: number | number[]) => {
  if (typeof navigator.vibrate === "function") navigator.vibrate(pattern)
}

const cardTransform = (dx: number, dy: number, tilt: number) =>
  `translate3d(${dx}px, ${dy * 0.2}px, 0) rotate(${tilt}deg)`

/**
 * The deck of Najdi parťáka (#84, brief › Swipe balíček). The buttons „Teď ne“ · „Vrátit“ ·
 * „Přidat“ are the main controls; the swipe and the arrow keys are shortcuts doing the same
 * (WCAG 2.5.1, 2.5.7, 2.1.1). Each action is sent at once and the card flies off without waiting;
 * a failure brings it back with a toast. Focus stays on the button pressed and a live region
 * says what happened and who is next (WCAG 4.1.3).
 */
export function PartnerDeck({
  viewerId,
  viewerName,
  radiusKm,
  onWiden,
  onFriendsChanged,
  onMatch,
}: {
  viewerId: string
  viewerName: string
  radiusKm: PartnerRadius
  /** „Hledat do 25 km“: the page puts the wider radius in the URL. */
  onWiden: (radius: PartnerRadius) => void
  /** After „Přidat“: the route refreshes what the friends feature shows. */
  onFriendsChanged?: () => Promise<unknown>
  /** A match, for the page's „Nové shody“. */
  onMatch?: (partner: Partner) => void
}) {
  const query = useInfiniteQuery(partnerDeckQueryOptions(viewerId, radiusKm))
  const [state, dispatch] = useReducer(moveDeck, undefined, emptyDeck)
  const [leaving, setLeaving] = useState<Leaving[]>([])
  const [match, setMatch] = useState<Partner>()
  const [message, setMessage] = useState("")
  // what the last „Přidat“ answered, as long as no fresher first page came meanwhile
  const [answered, setAnswered] = useState<{ left: number; after: unknown }>()
  const headingId = useId()
  const nameId = useId()
  const emptyHeading = useRef<HTMLHeadingElement>(null)
  const top = useRef<HTMLDivElement>(null)
  const next = useRef<HTMLDivElement>(null)
  const stamps = useRef<{ request: HTMLSpanElement | null; skip: HTMLSpanElement | null }>({
    request: null,
    skip: null,
  })
  const pendingSkips = useRef(new Map<string, Promise<void>>())
  const requestButton = useRef<HTMLButtonElement>(null)
  const drag = useRef<Drag | null>(null)
  const frame = useRef(0)
  const isLocked = useRef(false)
  const hasActed = useRef(false)
  const hasCrossedThreshold = useRef(false)
  const wasDragged = useRef(false)

  const clearLeaving = useCallback(
    (id: string) => setLeaving((cards) => cards.filter(({ partner }) => partner.id !== id)),
    [],
  )
  const keyHandler = useRef<(event: globalThis.KeyboardEvent) => void>(() => undefined)
  const attachKeys = useCallback((node: HTMLElement | null) => {
    if (!node) return
    const listener = (event: globalThis.KeyboardEvent) => keyHandler.current(event)
    node.addEventListener("keydown", listener)
    return () => node.removeEventListener("keydown", listener)
  }, [])
  const request = usePartnerRequest(onFriendsChanged)
  const skip = usePartnerSkip()
  const unskip = usePartnerUnskip()

  const pages = query.data?.pages
  const firstPage = pages?.[0]
  const items = useMemo(() => pages?.flatMap((page) => page.items) ?? [], [pages])
  const queue = deckQueue(items, state)
  const current = queue[0]
  const left =
    answered && answered.after === firstPage ? answered.left : (firstPage?.requestsLeft ?? 0)
  const canRequest = Boolean(current) && (left > 0 || current?.hasRequestedMe === true)

  // the next page while five cards are left, so nobody waits between cards
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query
  useEffect(() => {
    if (queue.length <= PREFETCH_WHEN_LEFT && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage()
    }
  }, [queue.length, hasNextPage, isFetchingNextPage, fetchNextPage])

  // the card that was second grows into the top one; what a drag left on it is cleared
  useLayoutEffect(() => {
    const element = top.current
    if (!element) return
    element.style.transform = ""
    element.style.transition = ""
  }, [current?.id])

  // the deck ran out under the user's hands: focus goes to what the page says now
  const isOut = query.isSuccess && !current && !hasNextPage
  useEffect(() => {
    if (isOut && hasActed.current) emptyHeading.current?.focus({ preventScroll: true })
  }, [isOut])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const paint = useCallback((dx: number, dy: number) => {
    const element = top.current
    if (!element) return
    const width = element.offsetWidth || 1
    const isReduced = isReducedMotion()
    const progress = dragProgress(dx, width)
    element.style.transform = cardTransform(dx, dy, isReduced ? 0 : tiltDeg(dx, width))
    if (stamps.current.request) stamps.current.request.style.opacity = String(dx > 0 ? progress : 0)
    if (stamps.current.skip) stamps.current.skip.style.opacity = String(dx < 0 ? progress : 0)
    if (next.current && !isReduced) {
      next.current.style.transform = `translateY(${12 * (1 - progress)}px) scale(${0.95 + 0.05 * progress})`
    }
    if (progress >= 1 && !hasCrossedThreshold.current) buzz(8)
    hasCrossedThreshold.current = progress >= 1
  }, [])

  const resetNext = () => {
    if (!next.current) return
    next.current.style.transform = ""
  }

  /** The action itself: sent at once, the card flies off without waiting for the answer. */
  function commit(direction: SwipeDirection, from: { dx: number; dy: number; vx: number }) {
    const partner = current
    const element = top.current
    if (!partner || isLocked.current) return
    if (direction === "request" && !canRequest) return
    isLocked.current = true
    hasActed.current = true
    window.setTimeout(() => {
      isLocked.current = false
    }, INPUT_LOCK_MS)

    const width = element && element.offsetWidth > 0 ? element.offsetWidth : 400
    const isReduced = isReducedMotion()
    const sign = direction === "request" ? 1 : -1
    const isButton = from.dx === 0 && from.vx === 0
    const startTilt = isReduced ? 0 : tiltDeg(from.dx, width)
    const endX = sign * (window.innerWidth + width)
    const durationMs = isReduced
      ? CROSSFADE_MS
      : isButton
        ? BUTTON_FLING.durationMs
        : flingDurationMs(Math.abs(endX - from.dx), from.vx)
    setLeaving((cards) => [
      ...cards,
      {
        partner,
        direction,
        from: cardTransform(from.dx, from.dy, startTilt),
        to: isReduced
          ? cardTransform(from.dx, from.dy, 0)
          : cardTransform(
              endX,
              from.dy + from.vx * 120,
              sign * (isButton ? BUTTON_FLING.tiltDeg : FLING_TILT_DEG),
            ),
        durationMs,
        isFade: isReduced,
      },
    ])
    buzz(15)
    dispatch({ type: direction, partner })
    const after = queue[1]
    if (direction === "skip") {
      setMessage(announce("skip", partner, after))
      const sent = skip.mutateAsync(partner.id).catch((error: unknown) => {
        dispatch({ type: "failed", partner })
        toast.error(
          (error instanceof Error && error.message) || "Přeskočení se nepovedlo. Zkus to znovu.",
        )
      })
      pendingSkips.current.set(partner.id, sent)
      void sent.finally(() => {
        if (pendingSkips.current.get(partner.id) === sent) pendingSkips.current.delete(partner.id)
      })
    } else {
      request.mutate(partner.id, {
        onSuccess: (result) => {
          setAnswered({ left: result.requestsLeft, after: firstPage })
          if (result.state === "friends") {
            buzz([20, 40, 20])
            setMessage(announce("match", partner, after))
            setMatch(partner)
            onMatch?.(partner)
          } else {
            setMessage(announce("request", partner, after))
          }
        },
        onError: (error) => {
          dispatch({ type: "failed", partner })
          // the day's limit: the server knows better than the count we had
          if ((error as { response?: { status?: number } }).response?.status === 429) {
            setAnswered({ left: 0, after: firstPage })
          }
          toast.error(error.message || "Žádost se nepodařilo odeslat. Zkus to znovu.")
        },
      })
    }
  }

  function undo() {
    const partner = state.undoable
    // not locked: the lock only stops a double click from skipping two people
    if (!partner) return
    dispatch({ type: "undo" })
    setMessage(announce("undo", partner, undefined))
    // a skip still on its way would land after the undo and hide the person again: wait for it
    const pending = pendingSkips.current.get(partner.id) ?? Promise.resolve()
    void pending.then(() =>
      unskip.mutate(partner.id, {
        onError: (error) => {
          // the skip stays on the server: it goes again, unless the card was acted on meanwhile
          dispatch({ type: "skip", partner })
          toast.error(error.message || "Vrátit se nepovedlo. Zkus to znovu.")
        },
      }),
    )
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || isLocked.current || !top.current) return
    wasDragged.current = false
    hasCrossedThreshold.current = false
    drag.current = {
      pointerId: event.pointerId,
      x0: event.clientX,
      y0: event.clientY,
      dx: 0,
      dy: 0,
      vx: 0,
      t: event.timeStamp,
    }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const gesture = drag.current
    const element = top.current
    if (gesture?.pointerId !== event.pointerId || !element) return
    const dx = event.clientX - gesture.x0
    const dy = event.clientY - gesture.y0
    if (!gesture.intent) {
      gesture.intent = dragIntent(dx, dy)
      if (gesture.intent === "scroll") {
        // the page scrolls on; the card isn't dragged
        drag.current = null
        return
      }
      if (gesture.intent === "drag") {
        wasDragged.current = true
        try {
          // the drag goes on when the pointer leaves the card
          element.setPointerCapture(event.pointerId)
        } catch {
          // a pointer that is no longer active (or a test) can't be captured; the drag still works
        }
        element.style.transition = "none"
        if (next.current) next.current.style.transition = "none"
        element.dataset.dragging = ""
      }
    }
    if (gesture.intent !== "drag") return
    const dt = event.timeStamp - gesture.t
    if (dt > 0) gesture.vx = (dx - gesture.dx) / dt
    gesture.dx = dx
    gesture.dy = dy
    gesture.t = event.timeStamp
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => paint(dx, dy))
  }

  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    const gesture = drag.current
    const element = top.current
    drag.current = null
    if (gesture?.pointerId !== event.pointerId || gesture.intent !== "drag" || !element) {
      return
    }
    cancelAnimationFrame(frame.current)
    delete element.dataset.dragging
    const width = element.offsetWidth || 1
    const direction =
      event.type === "pointercancel" ? undefined : releaseDirection(gesture.dx, gesture.vx, width)
    if (direction && (direction === "skip" || canRequest)) {
      // a drag is never „a button“: keep its speed off zero
      commit(direction, {
        dx: gesture.dx,
        dy: gesture.dy,
        vx: gesture.vx === 0 ? 0.0001 : gesture.vx,
      })
      return
    }
    // back to the middle with a slight overshoot; under reduced motion it is simply there
    const isReduced = isReducedMotion()
    element.style.transition = isReduced ? "none" : `transform ${SPRING_BACK_MS}ms ${SPRING_EASING}`
    element.style.transform = ""
    for (const stamp of [stamps.current.request, stamps.current.skip]) {
      if (!stamp) continue
      stamp.style.transition = "opacity 150ms ease-out"
      stamp.style.opacity = "0"
    }
    if (next.current) next.current.style.transition = ""
    resetNext()
  }

  function onKeyDown(event: globalThis.KeyboardEvent) {
    if (match || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === "ArrowLeft" && current) {
      event.preventDefault()
      commit("skip", { dx: 0, dy: 0, vx: 0 })
    } else if (event.key === "ArrowRight" && current) {
      event.preventDefault()
      commit("request", { dx: 0, dy: 0, vx: 0 })
    } else if (event.key === "Backspace" && state.undoable) {
      event.preventDefault()
      undo()
    }
  }

  // ← → and Backspace only while focus is in the deck: no single-key shortcuts for the whole
  // page (WCAG 2.1.4). A native listener, as the section itself isn't interactive.
  useLayoutEffect(() => {
    keyHandler.current = onKeyDown
  })

  if (firstPage && firstPage.missing.length > 0) {
    return <PartnersSetup missing={firstPage.missing} />
  }

  return (
    <section
      aria-labelledby={headingId}
      ref={attachKeys}
      aria-roledescription="balíček karet"
      className="flex w-full max-w-100 flex-col gap-4"
    >
      <h2
        id={headingId}
        className="sr-only"
      >
        Lidé z okolí
      </h2>
      <p
        role="status"
        className="sr-only"
      >
        {message}
      </p>

      {query.isError && !current ? (
        <PartnersError onRetry={() => void query.refetch()} />
      ) : query.isPending || (!current && (hasNextPage || isFetchingNextPage)) ? (
        <div
          role="status"
          aria-label="Načítám lidi z okolí"
          className="flex flex-col gap-4"
        >
          <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : !current ? (
        <PartnersEmpty
          ref={emptyHeading}
          radiusKm={radiusKm}
          onWiden={onWiden}
        />
      ) : (
        <div className="relative grid">
          {/* one list keyed by person, the top card first: the second one stays the same element
              when it moves up, so it grows into place instead of appearing */}
          {queue.slice(0, 2).map((partner, index) =>
            index === 0 ? (
              <div
                key={partner.id}
                ref={top}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
                onPointerCancel={onPointerEnd}
                onClickCapture={(event) => {
                  // a drag that ended on the name doesn't open the profile
                  if (wasDragged.current) {
                    event.preventDefault()
                    event.stopPropagation()
                    wasDragged.current = false
                  }
                }}
                className="hh-deck-card relative z-10 rounded-2xl select-none [grid-area:1/1] data-[dragging]:cursor-grabbing data-[dragging]:shadow-lg"
              >
                <PartnerCard
                  partner={partner}
                  nameId={nameId}
                />
                <DeckStamps
                  requestRef={(element) => {
                    stamps.current.request = element
                  }}
                  skipRef={(element) => {
                    stamps.current.skip = element
                  }}
                />
              </div>
            ) : (
              <div
                key={partner.id}
                ref={next}
                inert
                aria-hidden
                className="hh-deck-card hh-deck-next rounded-2xl [grid-area:1/1]"
              >
                <PartnerCard
                  partner={partner}
                  isInteractive={false}
                />
              </div>
            ),
          )}
          {leaving.map((card) => (
            <LeavingCard
              key={`leaving-${card.partner.id}`}
              leaving={card}
              onDone={clearLeaving}
            />
          ))}
        </div>
      )}

      {current ? (
        <div className="flex flex-col gap-2 bg-background max-md:sticky max-md:bottom-16 max-md:py-3">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3">
            <Button
              type="button"
              variant="outline"
              className="min-h-12"
              onClick={() => commit("skip", { dx: 0, dy: 0, vx: 0 })}
            >
              <X aria-hidden /> Teď ne
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Vrátit poslední přeskočení"
              // aria-disabled, not disabled: a disabled button would drop the focus on it
              aria-disabled={!state.undoable}
              className="size-12 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
              onClick={undo}
            >
              <Undo2 aria-hidden />
            </Button>
            <Button
              type="button"
              ref={requestButton}
              className="min-h-12 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
              aria-disabled={!canRequest}
              aria-describedby={canRequest ? undefined : `${headingId}-limit`}
              onClick={() => commit("request", { dx: 0, dy: 0, vx: 0 })}
            >
              <UserPlus aria-hidden /> Přidat
            </Button>
          </div>
          {!canRequest ? (
            <p
              id={`${headingId}-limit`}
              className="text-caption text-muted-foreground"
            >
              {DAILY_LIMIT_REACHED}
            </p>
          ) : requestsLeftLabel(left) ? (
            <p className="text-caption text-muted-foreground">{requestsLeftLabel(left)}</p>
          ) : null}
          <p className="text-caption text-muted-foreground max-md:hidden">
            Šipkami ← → to jde i z klávesnice.
          </p>
        </div>
      ) : null}

      {match ? (
        <PartnerMatch
          partner={match}
          viewerName={viewerName}
          onClose={() => setMatch(undefined)}
          // back to „Přidat“, also after a swipe; past the last card, to what the page says now
          onRestoreFocus={() =>
            (requestButton.current ?? emptyHeading.current)?.focus({ preventScroll: true })
          }
        />
      ) : null}
    </section>
  )
}

/**
 * „Přidat“ and „Teď ne“ in the photo's corners, fading in with the drag (brief › Razítka): the
 * pattern of the „Koná se“ stamp, but secondary and neutral, never lime — DESIGN.md lists where
 * lime may be, and a stamp isn't there.
 */
function DeckStamps({
  requestRef,
  skipRef,
  shown,
}: {
  requestRef?: (element: HTMLSpanElement | null) => void
  skipRef?: (element: HTMLSpanElement | null) => void
  shown?: SwipeDirection
}) {
  return (
    <span aria-hidden>
      <span
        ref={requestRef}
        style={{ opacity: shown === "request" ? 1 : 0 }}
        className="pointer-events-none absolute top-5 left-5 -rotate-8 rounded-md border border-tile-border bg-secondary px-2 py-1 type-stamp text-secondary-foreground"
      >
        Přidat
      </span>
      <span
        ref={skipRef}
        style={{ opacity: shown === "skip" ? 1 : 0 }}
        className="pointer-events-none absolute top-5 right-5 rotate-8 rounded-md border border-control-border bg-card px-2 py-1 type-stamp text-foreground"
      >
        Teď ne
      </span>
    </span>
  )
}

/**
 * The card on its way off: from where the drag let go (or the middle, for a button or a key),
 * out past the screen's edge, its stamp fully on. It floats, so it has the shadow. Under reduced
 * motion it fades where it is instead. Without the Web Animations API (tests) it is gone at once.
 */
function LeavingCard({ leaving, onDone }: { leaving: Leaving; onDone: (id: string) => void }) {
  const element = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const node = element.current
    const id = leaving.partner.id
    if (!node || typeof node.animate !== "function") {
      onDone(id)
      return
    }
    const animation = node.animate(
      leaving.isFade
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [{ transform: leaving.from }, { transform: leaving.to }],
      { duration: leaving.durationMs, easing: FLY_EASING, fill: "forwards" },
    )
    animation.onfinish = () => onDone(id)
    return () => animation.cancel()
  }, [leaving, onDone])
  return (
    <div
      ref={element}
      aria-hidden
      inert
      style={{ transform: leaving.from }}
      className={cn(
        "hh-deck-card pointer-events-none absolute inset-x-0 top-0 z-20 rounded-2xl",
        !leaving.isFade && "shadow-lg",
      )}
    >
      <PartnerCard
        partner={leaving.partner}
        isInteractive={false}
      />
      <DeckStamps shown={leaving.direction} />
    </div>
  )
}
