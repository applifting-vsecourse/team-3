import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import {
  ANNOUNCEMENT_BODY_MAX_LENGTH,
  ANNOUNCEMENT_SUBJECT_MAX_LENGTH,
} from "@/features/groups/api/groupSchemas"
import { groupAnnouncementsQueryOptions } from "@/features/groups/api/groupsQueryOptions"
import { useSendAnnouncement } from "@/features/groups/hooks/useGroupMutations"
import {
  announcementRecipientsLabel,
  remainingAnnouncementsLabel,
} from "@/features/groups/lib/formatGroup"

// Same rules as the API (CreateGroupAnnouncementDto), so the dialog says so before the server does.
const schema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, "Napiš předmět")
    .max(
      ANNOUNCEMENT_SUBJECT_MAX_LENGTH,
      `Předmět může mít nejvýš ${ANNOUNCEMENT_SUBJECT_MAX_LENGTH} znaků`,
    ),
  body: z
    .string()
    .trim()
    .min(1, "Napiš text oznámení")
    .max(
      ANNOUNCEMENT_BODY_MAX_LENGTH,
      `Text může mít nejvýš ${ANNOUNCEMENT_BODY_MAX_LENGTH} znaků`,
    ),
})

type FormValues = z.input<typeof schema>

type SendAnnouncementButtonProps = {
  groupId: string
  /** The signed-in admin, whose answer carries what is left of today's limit. */
  viewerId: string
  /** Active members including admins (the group's memberCount). */
  memberCount: number
  className?: string
}

/**
 * „Napsat členům“ in the group's management (#194, Figma D-08, D-08d):
 * subject and text, every active member (the admin too) gets it by e-mail and it
 * shows on the group page. Under the text, what is left of today's limit.
 * Like „Poslat žádost“, the dialog waits for the answer and keeps the text
 * when sending fails.
 */
export function SendAnnouncementButton({
  groupId,
  viewerId,
  memberCount,
  className,
}: SendAnnouncementButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const send = useSendAnnouncement(groupId)
  const announcementsQuery = useQuery(groupAnnouncementsQueryOptions(groupId, viewerId))
  const remainingToday = announcementsQuery.data?.remainingToday
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { subject: "", body: "" },
  })

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isNowOpen) => {
        setIsOpen(isNowOpen)
        if (!isNowOpen) form.reset()
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className={cn("h-11", className)}
        >
          Napsat členům
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit(async (values) => {
              try {
                await send.mutateAsync(schema.parse(values))
              } catch (error) {
                // the text stays in the dialog to try again
                toast.error((error as Error).message)
                return
              }
              toast.success("Oznámení je odeslané")
              setIsOpen(false)
              form.reset()
            })}
            className="flex flex-col gap-4"
          >
            <DialogHeader>
              <DialogTitle>Napsat členům</DialogTitle>
              <DialogDescription>{announcementRecipientsLabel(memberCount)}</DialogDescription>
            </DialogHeader>
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Předmět</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="off"
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Text</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  {typeof remainingToday === "number" ? (
                    <FormDescription>{remainingAnnouncementsLabel(remainingToday)}</FormDescription>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-11"
                >
                  Zpět
                </Button>
              </DialogClose>
              <Button
                type="submit"
                size="lg"
                className="h-11"
                disabled={send.isPending}
              >
                {send.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Odeslat
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
