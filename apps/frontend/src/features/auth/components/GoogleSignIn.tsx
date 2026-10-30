import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { LegalLink } from "@/components/LegalLink"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import { signInProvidersQueryOptions } from "@/features/auth/api/signInProviders"
import { GoogleMark } from "@/features/auth/components/GoogleMark"
import { useGoogleSignIn } from "@/features/auth/hooks/useGoogleSignIn"

type GoogleSignInProps = {
  /** The page to come back to once signed in (B-012), as on the form. */
  from?: string
}

/**
 * #154: „Pokračovat přes Google“ under the e-mail form on /login and /signup —
 * only once the server has Google's keys; until then (and when it can't be
 * asked) nothing shows. Below the form, so the fields don't move when it does.
 * Google can make a new account from either page, so both say what continuing
 * agrees to (#153's consent, its time stored by the server).
 */
export function GoogleSignIn({ from }: GoogleSignInProps) {
  const providers = useQuery(signInProvidersQueryOptions())
  const googleSignIn = useGoogleSignIn()

  if (!providers.data?.google) return null

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-sm text-muted-foreground">nebo</span>
        <Separator className="flex-1" />
      </div>

      {googleSignIn.error ? (
        <Alert variant="destructive">
          <AlertDescription>{googleSignIn.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-11 w-full"
        disabled={googleSignIn.isPending}
        onClick={() => googleSignIn.mutate(from)}
      >
        {googleSignIn.isPending ? <Loader2 className="size-4 animate-spin" /> : <GoogleMark />}
        Pokračovat přes Google
      </Button>

      <p className="text-sm text-muted-foreground">
        Pokračováním přes Google souhlasíš s{" "}
        <LegalLink to={ROUTES.terms}>podmínkami užívání</LegalLink> a bereš na vědomí{" "}
        <LegalLink to={ROUTES.privacy}>zpracování osobních údajů</LegalLink>.
      </p>
    </div>
  )
}
