import type { ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm, type Control } from "react-hook-form"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { LegalLink } from "@/components/LegalLink"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { PasswordStrength } from "@/features/auth/components/PasswordStrength"
import { nameSchema } from "@/features/auth/lib/name"
import { passwordSchema } from "@/features/auth/lib/password"

// B-010: name, e-mail and password; #153: the password twice and both consents
const schema = z
  .object({
    name: nameSchema,
    email: z.string().trim().min(1, "Vyplň e-mail").email("Tohle není platný e-mail"),
    password: passwordSchema,
    passwordConfirmation: z.string().min(1, "Zopakuj heslo"),
    termsAccepted: z
      .boolean()
      .refine(Boolean, "Bez souhlasu s podmínkami užívání se zaregistrovat nejde"),
    privacyAcknowledged: z
      .boolean()
      .refine(Boolean, "Potvrď, že bereš na vědomí zpracování osobních údajů"),
  })
  // runs even while other fields are wrong, so the mismatch shows straight away
  .refine((values) => values.password === values.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "Hesla se neshodují",
  })

type FormValues = z.infer<typeof schema>

/** What the sign-up sends: the repeated password stays in the form. */
export type SignUpValues = Omit<FormValues, "passwordConfirmation">

const defaultValues: FormValues = {
  name: "",
  email: "",
  password: "",
  passwordConfirmation: "",
  termsAccepted: false,
  privacyAcknowledged: false,
}

type SignUpFormProps = {
  isLoading: boolean
  errorMessage?: string | null
  onSubmit: (values: SignUpValues) => void | Promise<void>
}

/** Figma B-01 (#37): one account for joining events and organizing them. */
export function SignUpForm({ isLoading, errorMessage, onSubmit }: SignUpFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const submit = ({ passwordConfirmation: _repeated, ...values }: FormValues) => onSubmit(values)

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(submit)}
        className="space-y-4"
      >
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jméno</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormDescription>Uvidí ho organizátoři a účastníci akcí.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="např. jana@example.com"
                  autoComplete="email"
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          // once the form has been sent, a changed password checks the repeated one
          // again, so „Hesla se neshodují“ goes away when they match
          rules={{ deps: "passwordConfirmation" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Heslo</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <PasswordStrength password={field.value} />
              <FormDescription>Aspoň 10 znaků, písmeno a číslice.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="passwordConfirmation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Heslo znovu</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3 pt-2">
          <ConsentField
            control={form.control}
            name="termsAccepted"
          >
            Souhlasím s <LegalLink to={ROUTES.terms}>podmínkami užívání</LegalLink>
          </ConsentField>
          <ConsentField
            control={form.control}
            name="privacyAcknowledged"
          >
            Beru na vědomí <LegalLink to={ROUTES.privacy}>zpracování osobních údajů</LegalLink>
          </ConsentField>
        </div>

        <Button
          type="submit"
          size="lg"
          className="h-11 w-full"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
          Zaregistrovat se
        </Button>
      </form>
    </Form>
  )
}

type ConsentFieldProps = {
  control: Control<FormValues>
  name: "termsAccepted" | "privacyAcknowledged"
  children: ReactNode
}

/** #153: a required checkbox; its label carries the link to the page it is about. */
function ConsentField({ control, name, children }: ConsentFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
          <FormControl>
            <Checkbox
              ref={field.ref}
              name={field.name}
              // a screen reader says the consent is required (aria-required)
              required
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              onBlur={field.onBlur}
            />
          </FormControl>
          {/* block + leading-normal: a label that wraps on a phone keeps its lines apart */}
          <FormLabel className="block leading-normal font-normal">{children}</FormLabel>
          <FormMessage className="col-start-2" />
        </FormItem>
      )}
    />
  )
}
