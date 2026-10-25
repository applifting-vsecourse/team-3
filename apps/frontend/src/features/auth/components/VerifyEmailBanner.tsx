import { useQuery } from "@tanstack/react-query"
import { useLocation } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import { simulatedInboxQueryOptions } from "@/features/auth/api/simulatedInbox"
import { SimulatedInboxDialog } from "@/features/auth/components/SimulatedInboxDialog"
import { useResendVerificationEmail } from "@/features/auth/hooks/useResendVerificationEmail"
import { resendFrom } from "@/features/auth/lib/callback-url"
import { VERIFY_EMAIL_BANNER_ID } from "@/features/auth/lib/verify-email-banner"

/**
 * For a signed-in user whose e-mail isn't verified yet (B-011): without it
 * they can't join events or create events and groups. Sits above the header
 * on every page until the link is clicked; `showVerifyEmailBanner` leads here.
 */
export function VerifyEmailBanner({ email }: { email: string }) {
  const resend = useResendVerificationEmail()
  const location = useLocation()
  const inbox = useQuery(simulatedInboxQueryOptions(email))

  return (
    <div
      role="status"
      id={VERIFY_EMAIL_BANNER_ID}
      // focusable for `showVerifyEmailBanner`, not a stop when tabbing
      tabIndex={-1}
      className="border-b border-border bg-muted"
    >
      {/* the header's width and insets: text above the logo, buttons above the menu */}
      <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 text-sm md:px-10">
        <p>
          Ověř si e-mail: odkaz jsme poslali na <span className="font-semibold">{email}</span>. Bez
          ověření se nejde přihlásit na akci ani nic založit.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={resend.isPending}
            onClick={() =>
              resend.mutate(
                { email, from: resendFrom(location) },
                {
                  onSuccess: (result) =>
                    result === "already-verified"
                      ? toast.success("E-mail už je ověřený.")
                      : toast.success(`Nový odkaz je na cestě na ${email}. Platí 24 hodin.`),
                  onError: (error) => toast.error(error.message),
                },
              )
            }
          >
            {resend.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Poslat odkaz znovu
          </Button>
          {/* only where e-mails are simulated; real ones (404) or an error: nothing */}
          {inbox.data ? (
            <SimulatedInboxDialog
              email={email}
              messages={inbox.data.messages}
              onOpen={() => void inbox.refetch()}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
