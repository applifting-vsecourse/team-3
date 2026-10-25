import { useLocation } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import { useResendVerificationEmail } from "@/features/auth/hooks/useResendVerificationEmail"
import { resendFrom } from "@/features/auth/lib/callback-url"

/**
 * For a signed-in user whose e-mail isn't verified yet (B-011): without it
 * they can't join events or create events and groups. Sits above the header
 * on every page until the link is clicked.
 */
export function VerifyEmailBanner({ email }: { email: string }) {
  const resend = useResendVerificationEmail()
  const location = useLocation()

  return (
    <div
      role="status"
      className="border-b border-border bg-muted"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 text-sm md:px-8">
        <p>
          Ověř si e-mail: odkaz jsme poslali na <span className="font-semibold">{email}</span>. Bez
          ověření se nejde přihlásit na akci ani nic založit.
        </p>
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
      </div>
    </div>
  )
}
