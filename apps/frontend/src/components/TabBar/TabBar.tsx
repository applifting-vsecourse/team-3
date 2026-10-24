import type { ComponentProps } from "react"

import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

/**
 * A row of tabs (Figma: Tab — Moje akce, správa akce a skupiny): the items
 * share the width, the active one is semibold with a 2px foreground line,
 * the others muted over a hairline. Built on the kit's Tabs.
 */
export function TabBar({ className, ...props }: ComponentProps<typeof TabsList>) {
  return (
    <TabsList
      className={cn("h-auto w-full gap-0 rounded-none bg-transparent p-0", className)}
      {...props}
    />
  )
}

export function TabBarItem({ className, ...props }: ComponentProps<typeof TabsTrigger>) {
  return (
    <TabsTrigger
      className={cn(
        "h-auto flex-1 rounded-none border-0 border-b border-border px-3 pt-3 pb-2.5 text-sm font-medium text-muted-foreground",
        // the active state restates its dark: classes, the kit's would win otherwise (DESIGN.md › Colour)
        "data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground",
        // the kit raises the active tab with a shadow under this exact variant chain
        "group-data-[variant=default]/tabs-list:data-[state=active]:shadow-none",
        "dark:text-muted-foreground dark:data-[state=active]:border-foreground dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-foreground",
        className,
      )}
      {...props}
    />
  )
}
