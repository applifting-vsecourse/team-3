import type { ComponentProps } from "react"
import { useLocation } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import { useResendVerificationEmail } from "@/features/auth/hooks/useResendVerificationEmail"
import { resendFrom } from "@/features/auth/lib/callback-url"

type ResendVerificationButtonProps = Pick<ComponentProps<typeof Button>, "variant" | "size"> & {
  email: string
  /** The link is on its way, or the e-mail turned out to be verified already. */
  onDone?: () => void
}

/**
 * „Poslat odkaz znovu“ (#58): a new verification link that leads back to this
 * page. In the banner and in the dialog after a link that didn't work (#155).
 */
export function ResendVerificationButton({
  email,
  onDone,
  ...buttonProps
}: ResendVerificationButtonProps) {
  const resend = useResendVerificationEmail()
  const location = useLocation()

  return (
    <Button
      {...buttonProps}
      disabled={resend.isPending}
      onClick={() =>
        resend.mutate(
          { email, from: resendFrom(location) },
          {
            onSuccess: (result) => {
              if (result === "already-verified") toast.success("E-mail už je ověřený.")
              else toast.success(`Nový odkaz je na cestě na ${email}. Platí 24 hodin.`)
              onDone?.()
            },
            onError: (error) => toast.error(error.message),
          },
        )
      }
    >
      {resend.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
      Poslat odkaz znovu
    </Button>
  )
}
