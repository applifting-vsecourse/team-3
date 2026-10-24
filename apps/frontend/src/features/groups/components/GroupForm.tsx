import { useId } from "react"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Catalog } from "@/lib/catalog/catalogSearch"
import { localityOptions } from "@/lib/catalog/localityOptions"
import { cn } from "@/lib/utils"

import {
  GROUP_DESCRIPTION_MAX_LENGTH,
  GROUP_NAME_MAX_LENGTH,
  GROUP_TYPES,
  type GroupInput,
  type GroupType,
} from "@/features/groups/api/groupSchemas"

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Vyplň název skupiny")
    .max(GROUP_NAME_MAX_LENGTH, `Název může mít nejvýš ${GROUP_NAME_MAX_LENGTH} znaků`),
  activityId: z.string().min(1, "Skupina potřebuje právě jednu aktivitu"),
  localityId: z.string().min(1, "Skupina potřebuje právě jednu lokalitu"),
  type: z.enum(GROUP_TYPES, { message: "Vyber typ skupiny" }),
  description: z
    .string()
    .trim()
    .max(
      GROUP_DESCRIPTION_MAX_LENGTH,
      `Popis může mít nejvýš ${GROUP_DESCRIPTION_MAX_LENGTH} znaků`,
    ),
})

type FormValues = z.input<typeof schema>

/** Figma D-06: Radio card */
const TYPE_OPTIONS: { value: GroupType; title: string; hint: string }[] = [
  { value: "public", title: "Veřejná", hint: "Kdokoli se přidá jedním klepnutím." },
  { value: "closed", title: "Neveřejná", hint: "O členství se žádá, žádosti schvaluješ ty." },
]

type GroupFormProps = {
  catalog: Catalog
  /** Editing: the group's current values; founding: nothing is preselected. */
  initialValues?: GroupInput
  submitLabel: string
  /** Under the fields, e.g. „Zakladatel se stane správcem skupiny.“ */
  note?: string
  isSubmitting: boolean
  errorMessage?: string | null
  onSubmit: (input: GroupInput) => void | Promise<void>
}

/** Founding (D-06) and editing (D-07 › Upravit skupinu) share one form. */
export function GroupForm({
  catalog,
  initialValues,
  submitLabel,
  note,
  isSubmitting,
  errorMessage,
  onSubmit,
}: GroupFormProps) {
  const typeId = useId()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialValues?.name ?? "",
      activityId: initialValues?.activityId ?? "",
      localityId: initialValues?.localityId ?? "",
      type: initialValues?.type,
      description: initialValues?.description ?? "",
    },
  })

  const activityLabel = (id: string) => {
    for (const category of catalog.categories) {
      const activity = category.activities.find((a) => a.id === id)
      if (activity) return `${category.name} › ${activity.name}`
    }
    return undefined
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit((values) =>
          onSubmit({
            name: values.name.trim(),
            description: values.description.trim() || null,
            activityId: values.activityId,
            localityId: values.localityId,
            type: values.type,
          }),
        )}
        className="flex flex-col gap-5"
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
              <FormLabel>Název skupiny *</FormLabel>
              <FormControl>
                <Input
                  placeholder="např. Deskovky Holešovice"
                  autoComplete="off"
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
          name="activityId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aktivita *</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger
                    ref={field.ref}
                    onBlur={field.onBlur}
                    // same type size as the name input (Figma: 15 px in all fields)
                    className="w-full text-base data-[size=default]:h-11 md:text-sm"
                  >
                    <SelectValue placeholder="Vyber aktivitu">
                      {field.value ? activityLabel(field.value) : undefined}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent
                  // under the field like a dropdown; item-aligned would cover the form
                  position="popper"
                  className="max-h-80"
                >
                  {catalog.categories.map((category) => (
                    <SelectGroup key={category.id}>
                      <SelectLabel>{category.name}</SelectLabel>
                      {category.activities.map((activity) => (
                        <SelectItem
                          key={activity.id}
                          value={activity.id}
                        >
                          {activity.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="localityId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lokalita *</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger
                    ref={field.ref}
                    onBlur={field.onBlur}
                    // same type size as the name input (Figma: 15 px in all fields)
                    className="w-full text-base data-[size=default]:h-11 md:text-sm"
                  >
                    <SelectValue placeholder="Vyber lokalitu" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent
                  // under the field like a dropdown; item-aligned would cover the form
                  position="popper"
                  className="max-h-80"
                >
                  {localityOptions(catalog.localities).map((locality) => (
                    <SelectItem
                      key={locality.id}
                      value={locality.id}
                      // districts indented under their city, like the locality filter
                      className={cn(locality.isDistrict && "pl-6")}
                    >
                      {locality.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Typ skupiny *</FormLabel>
              <FormControl>
                <RadioGroup
                  ref={field.ref}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  className="gap-2"
                >
                  {TYPE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      htmlFor={`${typeId}-${option.value}`}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-accent",
                        field.value === option.value && "border-foreground",
                      )}
                    >
                      <RadioGroupItem
                        id={`${typeId}-${option.value}`}
                        value={option.value}
                      />
                      <span className="flex flex-col">
                        <span className="text-sm font-semibold">{option.title}</span>
                        <span className="text-sm text-muted-foreground">{option.hint}</span>
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Popis</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="např. Pravidelné deskovky v klubovně, hlavně středně těžké hry."
                  className="min-h-24"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}

        <Button
          type="submit"
          size="lg"
          // D-06d: as wide as its label on desktop
          className="h-11 w-full md:w-auto md:self-start"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </form>
    </Form>
  )
}
