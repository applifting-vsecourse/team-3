import type { ReactElement, ReactNode } from "react"
import { X } from "lucide-react"

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
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"
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
  applyLabel: string
  onApply: () => void
  /** Width of the desktop popover, e.g. "w-80". */
  popoverClassName?: string
}

/**
 * A filter's editor (Figma: Popover – termín, Spodní panel – termín):
 * a popover under the chip on desktop, a bottom panel on mobile. The choice
 * applies only on „Zobrazit…“, so the button can preview the result.
 */
export function FilterPanel({
  title,
  isOpen,
  onOpenChange,
  trigger,
  children,
  resetLabel,
  onReset,
  applyLabel,
  onApply,
  popoverClassName,
}: FilterPanelProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)

  if (isDesktop) {
    return (
      <Popover
        open={isOpen}
        onOpenChange={onOpenChange}
      >
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          align="start"
          aria-label={title}
          className={cn("flex flex-col p-0", popoverClassName)}
        >
          <div className="p-4">{children}</div>
          <div className="flex justify-end gap-3 border-t border-border px-4 py-3">
            <Button
              variant="ghost"
              className="h-11"
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
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader className="flex-row items-center gap-2 px-4 py-2">
          <DrawerTitle className="flex-1 text-left text-lg tracking-tight">{title}</DrawerTitle>
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
