import { useRef, useState, type ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { X } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { ActivityCombobox } from "@/components/CatalogCombobox/ActivityCombobox"
import { LocalityCombobox } from "@/components/CatalogCombobox/LocalityCombobox"
import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import { apiErrorCode } from "@/lib/api-client"
import type { ActivityCategory, Locality } from "@/lib/catalog/catalogSchemas"
import { cn } from "@/lib/utils"
import { NAME_MAX_LENGTH, nameProblem } from "@/lib/validation/name"

import { profileInputSchema, type ProfileInput } from "@/features/profile/api/profileSchemas"
import type { PhotoChange } from "@/features/profile/api/profileUpload"

import { ProfilePhotoField } from "./ProfilePhotoField"

const FIELD_OF_ERROR: Partial<Record<string, keyof ProfileInput>> = {
  INVALID_NAME: "name",
  UNKNOWN_LOCALITY: "homeLocalityId",
  UNKNOWN_ACTIVITY: "interestIds",
}

export type ProfileDraft = { settings: Partial<ProfileInput>; photo?: PhotoChange }

export type BioEditor = {
  bio: string
  name: string
  activityNames: string[]
  localityName?: string
  isDisabled: boolean
  apply: (bio: string) => void
}

export type ProfileEditorProps = {
  initial: ProfileInput
  draft?: ProfileDraft
  photoVersion?: string | null
  categories: ActivityCategory[]
  localities: Locality[]
  knownInterests?: { id: string; name: string }[]
  onSave: (
    settings: ProfileInput,
    photo?: PhotoChange,
  ) => Promise<{ settings: ProfileInput; photoVersion?: string | null } | void>
  onboarding?: {
    minimumInterests: number
    onBack: (draft: ProfileDraft) => void
    onSkip: () => Promise<void>
    renderBioSuggestion: (editor: BioEditor) => ReactNode
  }
}

function onboardingSchema(initialName: string, minimumInterests: number) {
  return profileInputSchema.extend({ name: z.string() }).superRefine((values, context) => {
    const nameError = values.name !== initialName ? nameProblem(values.name) : null
    if (nameError) context.addIssue({ code: "custom", path: ["name"], message: nameError })
    if (!values.homeLocalityId) {
      context.addIssue({
        code: "custom",
        path: ["homeLocalityId"],
        message: "Vyber domovskou lokalitu ze seznamu.",
      })
    }
    if (values.interestIds.length < minimumInterests) {
      context.addIssue({
        code: "custom",
        path: ["interestIds"],
        message: `Vyber alespoň ${minimumInterests} zájmy.`,
      })
    }
  })
}

function collectDraft(base: ProfileInput, values: ProfileInput, photo?: PhotoChange): ProfileDraft {
  const settings: Partial<ProfileInput> = Object.fromEntries(
    Object.entries(values).filter(
      ([key, value]) => JSON.stringify(base[key as keyof ProfileInput]) !== JSON.stringify(value),
    ),
  )
  return { settings, photo }
}

export function ProfileEditor({
  initial,
  draft,
  photoVersion,
  categories,
  localities,
  knownInterests = [],
  onSave,
  onboarding,
}: ProfileEditorProps) {
  const [photo, setPhoto] = useState(draft?.photo)
  const [savedPhoto, setSavedPhoto] = useState(photoVersion)
  const [errorMessage, setErrorMessage] = useState<string>()
  const [photoError, setPhotoError] = useState<string>()
  const [isSaved, setSaved] = useState(false)
  const [isSaving, setSaving] = useState(false)
  const isPending = useRef(false)
  const schema = onboarding
    ? onboardingSchema(initial.name, onboarding.minimumInterests)
    : profileInputSchema
  const form = useForm<ProfileInput>({
    resolver: zodResolver(schema),
    defaultValues: { ...initial, ...draft?.settings },
  })
  const values = useWatch({ control: form.control })
  const isBusy = form.formState.isSubmitting || isSaving
  const allActivities = categories.flatMap(({ activities }) => activities)
  const interestName = (id: string) =>
    allActivities.find((activity) => activity.id === id)?.name ??
    knownInterests.find((activity) => activity.id === id)?.name
  async function saveProfile({ bio, ...settings }: ProfileInput) {
    if (isPending.current) return
    isPending.current = true
    setSaving(true)
    setErrorMessage(undefined)
    setPhotoError(undefined)
    setSaved(false)
    try {
      const next = await onSave(
        onboarding || form.getFieldState("bio").isDirty ? { ...settings, bio } : settings,
        photo,
      )
      if (next) {
        form.reset(next.settings)
        setSavedPhoto(next.photoVersion)
        setPhoto(undefined)
        setSaved(true)
      }
    } catch (error) {
      const code = apiErrorCode(error)
      const message = error instanceof Error ? error.message : "Profil se nepodařilo uložit."
      const field = code ? FIELD_OF_ERROR[code] : undefined
      if (field) form.setError(field, { message }, { shouldFocus: true })
      else if (code === "INVALID_PHOTO") setPhotoError(message)
      else setErrorMessage(message)
    } finally {
      isPending.current = false
      setSaving(false)
    }
  }

  async function skip() {
    if (!onboarding || isPending.current) return
    isPending.current = true
    setSaving(true)
    setErrorMessage(undefined)
    try {
      await onboarding.onSkip()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Předvolby se nepodařilo uložit.")
    } finally {
      isPending.current = false
      setSaving(false)
    }
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={(event) => void form.handleSubmit(saveProfile)(event)}
        className="space-y-6"
      >
        <fieldset
          disabled={isBusy}
          className="min-w-0 space-y-5"
        >
          <ProfilePhotoField
            name={values.name ?? initial.name}
            version={savedPhoto}
            value={photo}
            isDisabled={isBusy}
            error={photoError}
            onChange={(value) => {
              setPhoto(value)
              setSaved(false)
              setPhotoError(undefined)
            }}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jméno</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="name"
                    maxLength={NAME_MAX_LENGTH}
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
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>O mně</FormLabel>
                <FormDescription>Text ve svém profilu uvidíš jen ty.</FormDescription>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Třeba co tě baví a na jakou akci bys rád/a vyrazil/a."
                    value={field.value ?? ""}
                    maxLength={500}
                    rows={4}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {onboarding?.renderBioSuggestion({
            bio: values.bio ?? "",
            name: values.name?.trim() ?? initial.name,
            activityNames: (values.interestIds ?? []).flatMap((id) => interestName(id) ?? []),
            localityName: localities.find(({ id }) => id === values.homeLocalityId)?.name,
            isDisabled: isBusy,
            apply: (bio) => form.setValue("bio", bio, { shouldDirty: true, shouldValidate: true }),
          })}
          <FormField
            control={form.control}
            name="homeLocalityId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Domovská lokalita</FormLabel>
                <FormControl>
                  <LocalityCombobox
                    localities={localities}
                    value={field.value ?? ""}
                    disabled={isBusy}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                </FormControl>
                {field.value && !onboarding ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-self-start"
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
                <FormLabel>Zájmy</FormLabel>
                <FormControl>
                  <ActivityCombobox
                    categories={categories}
                    value=""
                    disabled={isBusy || field.value.length >= 50}
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
                      const name = interestName(id) ?? "Aktivita"
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
        </fieldset>
        {errorMessage ? (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {errorMessage}
          </p>
        ) : null}
        {isSaved && !form.formState.isDirty ? (
          <p
            role="status"
            className="text-sm"
          >
            Profil je uložený.
          </p>
        ) : null}
        <div
          className={cn(
            "flex flex-wrap items-center gap-2",
            onboarding &&
              "sticky bottom-0 z-10 -mx-1 border-t border-card-border bg-background/95 px-1 py-3 shadow-[0_-8px_22px_-18px_var(--color-foreground)]",
          )}
        >
          {onboarding ? (
            <>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11"
                disabled={isBusy}
                onClick={() => onboarding.onBack(collectDraft(initial, form.getValues(), photo))}
              >
                Zpět
              </Button>
              <Button
                type="button"
                variant="link"
                className="min-h-11 sm:ml-auto"
                disabled={isBusy}
                onClick={() => void skip()}
              >
                Teď ne
              </Button>
            </>
          ) : null}
          <Button
            type="submit"
            className="min-h-11"
            disabled={isBusy}
          >
            {isBusy ? "Ukládám…" : onboarding ? "Uložit a ukázat akce" : "Uložit změny"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
