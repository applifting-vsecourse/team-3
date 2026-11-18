import { useEffect, useMemo, useRef, type Ref } from "react"
import { ImagePlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { EVENT_IMAGE_ACCEPT, eventImageProblem } from "@/features/events/lib/eventImage"

/**
 * The event's own image in the form (#77): none (the activity's photo shows),
 * the one already uploaded (editing), or a file picked now.
 */
export type EventImageValue =
  { kind: "none" } | { kind: "uploaded"; src: string } | { kind: "file"; file: File }

type EventImageFieldProps = {
  /** The visible control; FormControl gives it the label's id and the error's description. */
  ref?: Ref<HTMLButtonElement>
  value: EventImageValue
  onChange: (value: EventImageValue) => void
  /** A picked file that can't be used: the field keeps what it had and shows why. */
  onRefuse: (message: string) => void
  /** From FormControl, for the visible control. */
  id?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
}

/**
 * Figma D-01 „Přidat plakát nebo fotku“ (F-20): without an image one wide
 * outline button; with one its preview as the card will show it, „Vyměnit“
 * and „Odebrat“. The file input is the kit's, hidden: the button opens it.
 */
export function EventImageField({
  ref,
  value,
  onChange,
  onRefuse,
  ...control
}: EventImageFieldProps) {
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
      accept={EVENT_IMAGE_ACCEPT}
      // the button is the control: named by the label, in the tab order
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={(event) => {
        const picked = event.target.files?.[0]
        // the same file again must fire a change next time too
        event.target.value = ""
        if (!picked) return
        const problem = eventImageProblem(picked)
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
          Přidat plakát nebo fotku
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
