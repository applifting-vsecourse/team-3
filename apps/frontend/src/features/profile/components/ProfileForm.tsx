import type { ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { useForm } from "react-hook-form"

import { LocalityCombobox } from "@/components/CatalogCombobox/LocalityCombobox"
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
import { apiErrorCode } from "@/lib/api-client"
import { activityTreeQueryOptions, localitiesQueryOptions } from "@/lib/catalog/catalogQueryOptions"
import type { Activity, ActivityCategory } from "@/lib/catalog/catalogSchemas"

import {
  profileInputSchema,
  type ProfileInput,
  type SelfProfile,
} from "@/features/profile/api/profileSchemas"
import { useSaveProfile } from "@/features/profile/hooks/useProfileMutations"

import { ProfileError, ProfileLoading } from "./ProfileState"

// The API's refusals that are about one field: shown at it, not under the form
// (DESIGN.md › Forms). The API words them in Czech already.
const FIELD_OF_ERROR: Record<string, keyof ProfileInput> = {
  INVALID_NAME: "name",
  UNKNOWN_LOCALITY: "homeLocalityId",
  UNKNOWN_ACTIVITY: "interestIds",
}
/** What the interest picker gets: the catalog, what is picked and how to (un)pick one. */
export type InterestChoice = {
  categories: ActivityCategory[]
  selected: string[]
  onToggle: (activity: Activity) => void
}

/** As many as the API takes (profileInputSchema). */
const MAX_INTERESTS = 50

const fieldOfError = (error: unknown) => {
  const code = apiErrorCode(error)
  return code ? FIELD_OF_ERROR[code] : undefined
}

/** Údaje on /profil/upravit (Figma B-06, B-06d): name, home locality and interests. */
export function ProfileForm({
  profile,
  onSaved,
  interestChoice,
}: {
  profile: SelfProfile
  onSaved?: () => Promise<void>
  /** The onboarding's picker by category (the route puts it in): PO 26. 11. */
  interestChoice: (choice: InterestChoice) => ReactNode
}) {
  const activities = useQuery(activityTreeQueryOptions())
  const localities = useQuery(localitiesQueryOptions())
  const save = useSaveProfile(profile.id, onSaved)
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileInputSchema),
    defaultValues: {
      name: profile.name,
      homeLocalityId: profile.homeLocality?.id ?? null,
      interestIds: profile.interests.map((activity) => activity.id),
    },
  })
  if (activities.error || localities.error) {
    return (
      <ProfileError
        retry={() => {
          void activities.refetch()
          void localities.refetch()
        }}
      />
    )
  }
  if (!activities.data || !localities.data) return <ProfileLoading />
  const categories = activities.data
  const localityOptions = localities.data
  const allActivities = categories.flatMap((category) => category.activities)
  const submit = form.handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync(values)
      form.reset({
        name: saved.name,
        homeLocalityId: saved.homeLocality?.id ?? null,
        interestIds: saved.interests.map((activity) => activity.id),
      })
    } catch (error) {
      const field = fieldOfError(error)
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
        className="flex flex-col gap-6"
      >
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
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="homeLocalityId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Domovská lokalita</FormLabel>
              <FormControl>
                <LocalityCombobox
                  localities={localityOptions}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              </FormControl>
              {field.value ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => field.onChange(null)}
                >
                  Vymazat lokalitu
                </Button>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="interestIds"
          render={({ field }) => (
            <FormItem>
              {/* the picker is no single control, so a heading names it, not a <label> */}
              <p className="text-sm leading-none font-medium">Zájmy</p>
              {field.value.length ? (
                <ul
                  className="flex flex-wrap gap-2"
                  aria-label="Vybrané zájmy"
                >
                  {field.value.map((id) => {
                    const name =
                      allActivities.find((activity) => activity.id === id)?.name ??
                      profile.interests.find((activity) => activity.id === id)?.name ??
                      "Aktivita"
                    return (
                      <li key={id}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-label={`Odebrat zájem ${name}`}
                          onClick={() =>
                            field.onChange(field.value.filter((current) => current !== id))
                          }
                        >
                          {name}
                          <X
                            aria-hidden
                            className="size-4"
                          />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Vyber aktivity, které tě zajímají.</p>
              )}
              {/* PO 26. 11.: the same choice by category and activity as in the onboarding */}
              {interestChoice({
                categories,
                selected: field.value,
                onToggle: (activity) =>
                  field.onChange(
                    field.value.includes(activity.id)
                      ? field.value.filter((current) => current !== activity.id)
                      : field.value.length < MAX_INTERESTS
                        ? [...field.value, activity.id]
                        : field.value,
                  ),
              })}
              {/* a pick over the limit does nothing, so say why */}
              {field.value.length >= MAX_INTERESTS ? (
                <p
                  role="status"
                  className="text-sm text-muted-foreground"
                >
                  Víc než {MAX_INTERESTS} zájmů vybrat nejde. Některý odeber a pak přidej jiný.
                </p>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col items-start gap-3">
          {save.error && !fieldOfError(save.error) ? (
            <p
              role="alert"
              className="text-sm text-destructive"
            >
              {save.error.message}
            </p>
          ) : null}
          {save.isSuccess ? (
            <p
              role="status"
              className="text-sm"
            >
              Profil je uložený.
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={save.isPending || form.formState.isSubmitting}
          >
            {save.isPending ? "Ukládám…" : "Uložit změny"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
