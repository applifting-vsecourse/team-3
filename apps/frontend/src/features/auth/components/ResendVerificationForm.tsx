import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
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

import { useResendVerificationEmail } from "@/features/auth/hooks/useResendVerificationEmail"

const schema = z.object({
  email: z.string().trim().min(1, "Vyplň e-mail").email("Tohle není platný e-mail"),
})

/** No address is inferred from a failed/untrusted token. The visitor supplies it. */
export function ResendVerificationForm({ from }: { from: string }) {
  const resend = useResendVerificationEmail()
  const [isSent, setSent] = useState(false)
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  })
  return (
    <Form {...form}>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(async ({ email }) => {
          try {
            await resend.mutateAsync({ email, from })
            setSent(true)
          } catch {
            /* The error stays under the form. */
          }
        })}
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail k ověření</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="např. jana@example.com"
                  className="h-11"
                  {...field}
                  onChange={(event) => {
                    setSent(false)
                    field.onChange(event)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {resend.error ? (
          <Alert variant="destructive">
            <AlertDescription>{resend.error.message}</AlertDescription>
          </Alert>
        ) : null}
        <p
          role="status"
          className="text-sm text-muted-foreground"
        >
          {isSent
            ? "Pokud e-mail čeká na ověření, nový odkaz je na cestě. Zkontroluj schránku i spam. Odkaz platí 24 hodin."
            : ""}
        </p>
        <Button
          type="submit"
          disabled={resend.isPending || isSent}
        >
          {resend.isPending ? <Loader2 className="size-4 animate-spin" /> : null}Poslat odkaz znovu
        </Button>
      </form>
    </Form>
  )
}
