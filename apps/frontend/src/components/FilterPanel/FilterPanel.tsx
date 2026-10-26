import { useRef, type ReactElement, type ReactNode, type RefObject } from "react"
import { ArrowLeft, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DESKTOP_QUERY, FINE_POINTER_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"

type FilterPanelProps = {
  title: string
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  /** The chip that opens the panel. */
  trigger: ReactElement
  children: ReactNode
  resetLabel: string
  onReset: () => void
  /** Nothing to reset, e.g. Celé Česko in Lokalita. */
  isResetDisabled?: boolean
  applyLabel: string
  onApply: () => void
  /** Width of the desktop popover, e.g. "w-80". */
  popoverClassName?: string
  /** Mobile second level (Figma A-02b): a back arrow before the title. */
  onBack?: () => void
  backLabel?: string
  /**
   * Focused on opening, e.g. the search field, so typing goes straight
   * there. Not with a finger: the keyboard would cover the list, and iOS
   * doesn't show it for a focus the user didn't tap; the bottom panel's
   * title gets the focus instead, so a screen reader starts in the panel.
   */
  initialFocusRef?: RefObject<HTMLElement | null>
}

/**
 * A filter's editor (Figma: Popover – termín, Spodní panel – termín):
 * a popover under the chip on desktop, a bottom panel on mobile. The choice
 * applies only on „Zobrazit…“, so the button can preview the result.
 *
 * Neither is taller than the window: the content scrolls and the buttons stay
 * in view under it, however long the list (#157).
 */
export function FilterPanel({
  title,
  isOpen,
  onOpenChange,
  trigger,
  children,
  resetLabel,
  onReset,
  isResetDisabled,
  applyLabel,
  onApply,
  popoverClassName,
  onBack,
  backLabel = "Zpět",
  initialFocusRef,
}: FilterPanelProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const hasFinePointer = useMediaQuery(FINE_POINTER_QUERY)
  const titleRef = useRef<HTMLHeadingElement>(null)

  if (isDesktop) {
    return (
      <Popover
        open={isOpen}
        onOpenChange={onOpenChange}
      >
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          align="start"
          // at most the height left under the chip, 16 px short of the window's edge
          collisionPadding={16}
          aria-label={title}
          // the field itself, not whatever comes first in the panel
          onOpenAutoFocus={(event) => {
            const field = initialFocusRef?.current
            if (!field) return
            event.preventDefault()
            field.focus({ preventScroll: true })
          }}
          className={cn(
            "flex max-h-(--radix-popover-content-available-height) flex-col p-0",
            popoverClassName,
          )}
        >
          {/* min-h-0 lets the column shrink it below its content, so it scrolls;
              overscroll-contain keeps the page behind still at its end */}
          <div className="min-h-0 overflow-y-auto overscroll-contain p-4">{children}</div>
          <div className="flex justify-end gap-3 border-t border-border px-4 py-3">
            <Button
              variant="ghost"
              className="h-11"
              disabled={isResetDisabled}
              onClick={onReset}
            >
              {resetLabel}
            </Button>
            <Button
              className="h-11 font-semibold"
              onClick={onApply}
            >
              {applyLabel}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onOpenChange}
    >
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent
        aria-describedby={undefined}
        // vaul leaves the focus on the chip behind the panel
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          const field = hasFinePointer ? initialFocusRef?.current : undefined
          const target = field ?? titleRef.current
          target?.focus({ preventScroll: true })
        }}
      >
        <DrawerHeader className="flex-row items-center gap-2 px-4 py-2">
          {onBack ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label={backLabel}
              onClick={onBack}
            >
              <ArrowLeft className="size-6" />
            </Button>
          ) : null}
          {/* focusable only from code, as the start of the panel; not a control, so no ring */}
          <DrawerTitle
            ref={titleRef}
            tabIndex={-1}
            className="flex-1 text-left text-lg tracking-tight outline-none"
          >
            {title}
          </DrawerTitle>
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Zavřít"
            >
              <X className="size-6" />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4">{children}</div>
        <DrawerFooter className="mt-0 flex-row gap-3 border-t border-border pt-3">
          <Button
            variant="outline"
            className="h-11"
            disabled={isResetDisabled}
            onClick={onReset}
          >
            {resetLabel}
          </Button>
          <Button
            className="h-11 flex-1 font-semibold"
            onClick={onApply}
          >
            {applyLabel}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
