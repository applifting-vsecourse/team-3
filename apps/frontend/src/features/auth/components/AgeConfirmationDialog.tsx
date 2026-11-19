import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { api } from "@/lib/api-client"

import { useSession } from "@/features/auth/hooks/useSession"
import { useSignOut } from "@/features/auth/hooks/useSignOut"

/** Existing and Google accounts confirm once; e-mail sign-ups confirm in the form. */
export function AgeConfirmationDialog() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const signOut = useSignOut()
  const confirm = useMutation({
    mutationFn: () => api.post("me/confirm-age", { json: { ageConfirmed: true } }).json(),
    onSuccess: async () => {
      await queryClient.invalidateQueries()
    },
  })

  return (
    <Dialog open={user?.ageConfirmedAt === null}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Potvrď svůj věk</DialogTitle>
          <DialogDescription>
            HobbyHub je určený pro osoby od 18 let. Pro pokračování potvrď, že ti je alespoň 18 let.
          </DialogDescription>
        </DialogHeader>
        {confirm.error ? (
          <Alert variant="destructive">
            <AlertDescription>Potvrzení věku se nepovedlo. Zkus to prosím znovu.</AlertDescription>
          </Alert>
        ) : null}
        {signOut.error ? (
          <Alert variant="destructive">
            <AlertDescription>Odhlášení se nepovedlo. Zkus to prosím znovu.</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => signOut.mutate()}
            disabled={signOut.isPending || confirm.isPending}
          >
            Odhlásit se
          </Button>
          <Button
            onClick={() => confirm.mutate()}
            disabled={confirm.isPending || signOut.isPending}
          >
            {confirm.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Potvrzuji, že mi je alespoň 18 let
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
