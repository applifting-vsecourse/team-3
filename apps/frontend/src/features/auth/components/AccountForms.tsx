import { useMemo } from "react"
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
import { preloadPasswordChecker } from "@/features/auth/lib/load-password-checker"
import { passwordSchema, passwordUserInputs } from "@/features/auth/lib/password"

export type AccountProfile = { name: string; email: string; hasPassword: boolean }

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Vyplň původní heslo."),
    newPassword: passwordSchema,
    confirmation: z.string().min(1, "Zopakuj nové heslo."),
  })
  .refine((value) => value.newPassword === value.confirmation, {
    path: ["confirmation"],
    message: "Hesla se neshodují.",
  })
const emailFormSchema = z.object({ newEmail: z.string().trim().email("Zadej platný e-mail.") })

export function AccountForms({ profile }: { profile: AccountProfile }) {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <section
        className="space-y-4"
        aria-labelledby="password-heading"
      >
        <h2
          id="password-heading"
          className="type-feature"
        >
          Změna hesla
        </h2>
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
        <h2
          id="email-heading"
          className="type-feature"
        >
          Změna e-mailu
        </h2>
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
  const submit = form.handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await mutation.mutateAsync({ currentPassword, newPassword })
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
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Původní heslo</FormLabel>
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
