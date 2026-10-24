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

// the same rule as at sign-up (BetterAuth's minimum is 8)
const MIN_PASSWORD_LENGTH = 8

const schema = z
  .object({
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Heslo musí mít aspoň ${MIN_PASSWORD_LENGTH} znaků`),
    passwordConfirmation: z.string().min(1, "Zopakujte heslo"),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: "Hesla se neshodují",
    path: ["passwordConfirmation"],
  })

type FormValues = z.infer<typeof schema>

type ResetPasswordFormProps = {
  isLoading: boolean
  errorMessage?: string | null
  onSubmit: (newPassword: string) => void | Promise<void>
}

export function ResetPasswordForm({ isLoading, errorMessage, onSubmit }: ResetPasswordFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", passwordConfirmation: "" },
  })

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => onSubmit(values.password))}
        className="space-y-4"
      >
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nové heslo</FormLabel>
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

        <FormField
          control={form.control}
          name="passwordConfirmation"
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

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
          Nastavit heslo
        </Button>
      </form>
    </Form>
  )
}
