import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { PasswordStrength } from "@/features/auth/components/PasswordStrength"
import { useChangeEmail, useChangePassword } from "@/features/auth/hooks/useAccountMutations"
import { AuthRequestError } from "@/features/auth/lib/auth-errors"
import { preloadPasswordChecker } from "@/features/auth/lib/load-password-checker"
import { passwordSchema, passwordUserInputs } from "@/features/auth/lib/password"

export type AccountProfile = { name: string; email: string; hasPassword: boolean }

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Vyplň současné heslo."),
    newPassword: passwordSchema,
    confirmation: z.string().min(1, "Zopakuj nové heslo."),
  })
  .refine((value) => value.newPassword === value.confirmation, {
    path: ["confirmation"],
    message: "Hesla se neshodují.",
  })
const emailFormSchema = z.object({ newEmail: z.string().trim().email("Zadej platný e-mail.") })

// BetterAuth's refusals that are about one field of the password form: shown
// at it (DESIGN.md › Forms), everything else under the form.
const PASSWORD_FIELD_OF_ERROR: Record<string, "currentPassword" | "newPassword"> = {
  INVALID_PASSWORD: "currentPassword",
  WEAK_PASSWORD: "newPassword",
  PASSWORD_COMPROMISED: "newPassword",
  PASSWORD_TOO_SHORT: "newPassword",
  PASSWORD_TOO_LONG: "newPassword",
}
const passwordFieldOfError = (error: unknown) =>
  error instanceof AuthRequestError && error.code ? PASSWORD_FIELD_OF_ERROR[error.code] : undefined

/** Účet on /profil/upravit (Figma B-06, B-06d): password, then e-mail, one under the other. */
export function AccountForms({ profile }: { profile: AccountProfile }) {
  return (
    <div className="flex flex-col gap-8">
      <section
        className="space-y-4"
        aria-labelledby="password-heading"
      >
        <h3
          id="password-heading"
          className="text-body font-semibold"
        >
          Změna hesla
        </h3>
        {profile.hasPassword ? (
          <ChangePasswordForm profile={profile} />
        ) : (
          <div className="space-y-3 text-sm">
            <p>Používáš přihlášení přes Google. Pro nastavení hesla si pošli odkaz na obnovu.</p>
            <Button
              asChild
              variant="outline"
            >
              <Link to={ROUTES.forgotPassword}>Nastavit heslo přes e-mail</Link>
            </Button>
          </div>
        )}
      </section>
      <section
        className="space-y-4"
        aria-labelledby="email-heading"
      >
        <h3
          id="email-heading"
          className="text-body font-semibold"
        >
          Změna e-mailu
        </h3>
        <p className="text-sm break-all text-muted-foreground">
          Aktuální e-mail: <span className="text-foreground">{profile.email}</span>
        </p>
        <ChangeEmailForm />
      </section>
    </div>
  )
}

export function ChangePasswordForm({ profile }: { profile: AccountProfile }) {
  const mutation = useChangePassword()
  const form = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmation: "" },
  })
  const password = useWatch({ control: form.control, name: "newPassword" })
  const userInputs = useMemo(
    () => passwordUserInputs(profile.name, profile.email),
    [profile.name, profile.email],
  )
  // #199: the strength area stays once shown (so typing doesn't move the
  // form); after a successful change the emptied field starts afresh
  const [strengthKey, setStrengthKey] = useState(0)
  const submit = form.handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await mutation.mutateAsync({ currentPassword, newPassword })
      form.reset()
      setStrengthKey((key) => key + 1)
    } catch (error) {
      const field = passwordFieldOfError(error)
      if (field && error instanceof Error) {
        form.setError(field, { message: error.message }, { shouldFocus: true })
      }
      /* Anything else the mutation renders below the form. */
    }
  })
  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={submit}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Současné heslo</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nové heslo</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  onFocus={preloadPasswordChecker}
                  {...field}
                />
              </FormControl>
              <PasswordStrength
                key={strengthKey}
                password={password}
                userInputs={userInputs}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nové heslo znovu</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {mutation.error && !passwordFieldOfError(mutation.error) ? (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {mutation.error.message}
          </p>
        ) : null}
        {mutation.isSuccess ? (
          <p
            role="status"
            className="text-sm"
          >
            Heslo je změněné. Ostatní přihlášení jsou ukončená.
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={mutation.isPending || form.formState.isSubmitting}
        >
          {mutation.isPending ? "Měním heslo…" : "Změnit heslo"}
        </Button>
      </form>
    </Form>
  )
}

export function ChangeEmailForm() {
  const mutation = useChangeEmail()
  const form = useForm<z.infer<typeof emailFormSchema>>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { newEmail: "" },
  })
  const submit = form.handleSubmit(async ({ newEmail }) => {
    try {
      await mutation.mutateAsync(newEmail)
      form.reset()
    } catch {
      /* The mutation error is rendered below. */
    }
  })
  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={submit}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="newEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nový e-mail</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <p className="text-sm text-muted-foreground">
          Nová adresa začne platit až po ověření odkazem v e-mailu.
        </p>
        {mutation.error ? (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {mutation.error.message}
          </p>
        ) : null}
        {mutation.isSuccess ? (
          <p
            role="status"
            className="text-sm"
          >
            Pokud lze novou adresu použít, přijde na ni ověřovací e-mail. Do ověření platí původní
            adresa.
          </p>
        ) : null}
        <Button
          type="submit"
          variant="outline"
          disabled={mutation.isPending || form.formState.isSubmitting}
        >
          {mutation.isPending ? "Odesílám…" : "Ověřit nový e-mail"}
        </Button>
      </form>
    </Form>
  )
}
