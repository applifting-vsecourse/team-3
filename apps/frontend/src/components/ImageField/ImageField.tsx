import { useEffect, useMemo, useRef, type Ref } from "react"
import { ImagePlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { IMAGE_ACCEPT, imageProblem, type ImageChange } from "@/lib/image"

/**
 * An event's or a group's own image in its form (#77): none (the activity's
 * photo shows), the one already uploaded (editing), or a file picked now.
 */
export type ImageFieldValue =
  { kind: "none" } | { kind: "uploaded"; src: string } | { kind: "file"; file: File }

/** The field's starting value: the image the event or group has, if any. */
export const initialImageValue = (src: string | null | undefined): ImageFieldValue =>
  src ? { kind: "uploaded", src } : { kind: "none" }

/** What to send after saving: a picked file, removing the image it had, or nothing. */
export const imageChangeOf = (value: ImageFieldValue, hasImage: boolean): ImageChange =>
  value.kind === "file"
    ? { kind: "set", file: value.file }
    : value.kind === "none" && hasImage
      ? { kind: "remove" }
      : { kind: "keep" }

type ImageFieldProps = {
  /** The visible control; FormControl gives it the label's id and the error's description. */
  ref?: Ref<HTMLButtonElement>
  value: ImageFieldValue
  onChange: (value: ImageFieldValue) => void
  /** The empty field's button, e.g. „Přidat plakát nebo fotku“ (Figma D-01). */
  addLabel: string
  /** A picked file that can't be used: the field keeps what it had and shows why. */
  onRefuse: (message: string) => void
  /** From FormControl, for the visible control. */
  id?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
}

/**
 * Figma Pole/Plakát nebo fotka (D-01, F-20): without an image one wide dashed
 * outline button; with one its preview as the card will show it, „Vyměnit
 * obrázek“ and „Odebrat“. The file input is the kit's, hidden: the button opens it.
 */
export function ImageField({
  ref,
  value,
  onChange,
  onRefuse,
  addLabel,
  ...control
}: ImageFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const pickRef = useRef<HTMLButtonElement | null>(null)
  const file = value.kind === "file" ? value.file : null
  const fileUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(
    () => () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl)
    },
    [fileUrl],
  )
  const previewSrc = value.kind === "uploaded" ? value.src : fileUrl

  const setPickRef = (node: HTMLButtonElement | null) => {
    pickRef.current = node
    if (typeof ref === "function") ref(node)
    else if (ref) ref.current = node
  }

  const fileInput = (
    <Input
      ref={fileRef}
      type="file"
      accept={IMAGE_ACCEPT}
      // the button is the control: named by the label, in the tab order
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={(event) => {
        const picked = event.target.files?.[0]
        // the same file again must fire a change next time too
        event.target.value = ""
        if (!picked) return
        const problem = imageProblem(picked)
        if (problem) onRefuse(problem)
        else onChange({ kind: "file", file: picked })
      }}
    />
  )

  if (!previewSrc) {
    return (
      <>
        <Button
          ref={setPickRef}
          type="button"
          variant="outline"
          className="h-22 w-full flex-col gap-1 border-dashed bg-card font-normal"
          onClick={() => fileRef.current?.click()}
          {...control}
        >
          <ImagePlus className="size-5 text-muted-foreground" />
          {addLabel}
        </Button>
        {fileInput}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <img
        src={previewSrc}
        // decoration: the label says what it is
        alt=""
        className="h-40 w-full rounded-xl border border-card-border object-cover contrast-110 saturate-86 md:h-50"
      />
      <div className="flex gap-2">
        <Button
          ref={setPickRef}
          type="button"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          {...control}
        >
          Vyměnit obrázek
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            onChange({ kind: "none" })
            // the button just pressed goes away: focus the one that takes its place
            requestAnimationFrame(() => pickRef.current?.focus())
          }}
        >
          Odebrat
        </Button>
      </div>
      {fileInput}
    </div>
  )
}
