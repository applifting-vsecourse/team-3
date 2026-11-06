import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { useForm } from "react-hook-form"

import { ActivityCombobox } from "@/components/CatalogCombobox/ActivityCombobox"
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
import { activityTreeQueryOptions, localitiesQueryOptions } from "@/lib/catalog/catalogQueryOptions"

import {
  profileInputSchema,
  type ProfileInput,
  type SelfProfile,
} from "@/features/profile/api/profileSchemas"
import { useSaveProfile } from "@/features/profile/hooks/useProfileMutations"

import { ProfileError, ProfileLoading } from "./ProfileState"

export function ProfileForm({
  profile,
  onSaved,
}: {
  profile: SelfProfile
  onSaved?: () => Promise<void>
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
    } catch {
      /* The mutation renders its error below. */
    }
  })
  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={submit}
        className="grid gap-6 md:grid-cols-2"
      >
        <div className="space-y-6">
          <h2 className="text-xl font-semibold tracking-tight">Základní údaje</h2>
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
        </div>
        <div className="space-y-6">
          <h2 className="text-xl font-semibold tracking-tight">Co tě baví</h2>
          <FormField
            control={form.control}
            name="interestIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Zájmy</FormLabel>
                <FormControl>
                  <ActivityCombobox
                    categories={categories}
                    value=""
                    disabled={field.value.length >= 50}
                    onChange={(id) => {
                      if (!field.value.includes(id)) field.onChange([...field.value, id])
                    }}
                  />
                </FormControl>
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
                  <p className="text-sm text-muted-foreground">
                    Vyber aktivity, které tě zajímají.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="space-y-3 md:col-span-2">
          {save.error ? (
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
            {save.isPending ? "Ukládám…" : "Uložit profil"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
