import { Check } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useMarkAllNotificationsRead } from "@/features/notifications/hooks/useNotificationMutations"

/** „Označit vše jako přečtené“ (Figma C-07d) or, in the phone's bar, „Označit vše“ (C-07). */
export function MarkAllReadButton({
  label,
  hasIcon = false,
  className,
}: {
  label: string
  hasIcon?: boolean
  className?: string
}) {
  const markAll = useMarkAllNotificationsRead()
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(className)}
      disabled={markAll.isPending}
      onClick={() =>
        markAll.mutate(undefined, {
          onError: (error) => toast.error(error.message),
        })
      }
    >
      {hasIcon ? (
        <Check
          className="size-4"
          aria-hidden
        />
      ) : null}
      {label}
    </Button>
  )
}
