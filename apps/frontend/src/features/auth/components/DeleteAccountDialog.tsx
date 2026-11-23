import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import { Loader2, Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { apiErrorCode } from "@/lib/api-client"

import type { AccountSummary } from "@/features/auth/api/accountApi"
import { useDeleteAccount } from "@/features/auth/hooks/useAccountActions"

// the API's refusals that belong to the one field of the dialog; anything else goes under it
const FIELD_ERRORS = new Set([
  "PASSWORD_REQUIRED",
  "INVALID_PASSWORD",
  "CONFIRMATION_MISMATCH",
  "REAUTHENTICATION_REQUIRED",
])

const normalize = (text: string) => text.trim().replace(/\s+/g, " ").toLocaleLowerCase("cs")

/**
 * „Smazat účet“ (B-080, #64) with its confirmation: what happens, said before
 * it does, and the proof that it is the owner (OWASP re-authentication) — the
 * password, or for an account without one (Google) the phrase. The server's
 * refusal shows at the field (DESIGN.md › Forms). Destructive only inside the
 * dialog, as „Deaktivovat skupinu“.
 */
export function DeleteAccountDialog({ summary }: { summary: AccountSummary }) {
  const [isOpen, setIsOpen] = useState(false)
  const remove = useDeleteAccount()
  const { hasPassword, confirmationPhrase } = summary
  const schema = z.object({
    secret: hasPassword
      ? z.string().min(1, "Napiš svoje heslo.")
      : z
          .string()
          .refine(
            (value) => normalize(value) === confirmationPhrase,
            `Pro potvrzení napiš „${confirmationPhrase}“.`,
          ),
  })
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { secret: "" },
  })
  const otherError =
    remove.error && !FIELD_ERRORS.has(apiErrorCode(remove.error) ?? "") ? remove.error : null

  const submit = form.handleSubmit(async ({ secret }) => {
    try {
      await remove.mutateAsync(hasPassword ? { password: secret } : { confirmation: secret })
    } catch (error) {
      if (FIELD_ERRORS.has(apiErrorCode(error) ?? "") && error instanceof Error) {
        form.setError("secret", { message: error.message }, { shouldFocus: true })
      }
    }
  })

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isNowOpen) => {
        setIsOpen(isNowOpen)
        if (!isNowOpen) {
          form.reset()
          remove.reset()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="self-start"
        >
          <Trash2 />
          Smazat účet
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form
            noValidate
            onSubmit={submit}
            className="flex flex-col gap-4"
          >
            <DialogHeader>
              <DialogTitle>Smazat účet?</DialogTitle>
              <DialogDescription>
                Smazání nejde vrátit. Jestli chceš svoje data mít, stáhni si je nejdřív.
              </DialogDescription>
            </DialogHeader>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
              {summary.upcomingOrganizedCount > 0 ? (
                <li>
                  Tvoje nadcházející akce se zruší ({summary.upcomingOrganizedCount}) a účastníkům
                  přijde upozornění.
                </li>
              ) : null}
              <li>Z nadcházejících akcí se odhlásíš, ze skupin odejdeš a přátelství se zruší.</li>
              <li>U proběhlých akcí a hodnocení bude místo tvého jména „Smazaný uživatel“.</li>
              <li>
                Přihlásit se už nepůjde. Stejný e-mail můžeš později použít k nové registraci.
              </li>
            </ul>
            {summary.groupsRunAlone.length ? (
              <div className="flex flex-col gap-2 text-sm">
                <p>
                  Tyhle skupiny nemají jiného správce. Předej správu, jinak se skupina deaktivuje a
                  její nadcházející akce se zruší:
                </p>
                <ul
                  aria-label="Skupiny bez jiného správce"
                  className="flex list-disc flex-col gap-1 pl-5"
                >
                  {summary.groupsRunAlone.map((group) => (
                    <li key={group.id}>
                      <Link
                        to={ROUTES.groupDetail}
                        params={{ groupId: group.id }}
                        className="underline underline-offset-4"
                      >
                        {group.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <FormField
              control={form.control}
              name="secret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {hasPassword ? "Heslo" : `Pro potvrzení napiš „${confirmationPhrase}“`}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type={hasPassword ? "password" : "text"}
                      autoComplete={hasPassword ? "current-password" : "off"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {otherError ? (
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                {otherError.message}
              </p>
            ) : null}
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                >
                  Zpět
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant="destructive"
                disabled={remove.isPending}
              >
                {remove.isPending ? <Loader2 className="animate-spin" /> : null}
                Smazat účet
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
