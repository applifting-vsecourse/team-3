import { useEffect, useId, useRef, useState } from "react"
import { Camera, LockKeyhole, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { IMAGE_ACCEPT, imageProblem } from "@/lib/image"

import type { PhotoChange } from "@/features/profile/api/profileUpload"

import { ProfileAvatar } from "./ProfileAvatar"

export function ProfilePhotoField({
  name,
  version,
  value,
  isDisabled,
  error,
  onChange,
}: {
  name: string
  version?: string | null
  value?: PhotoChange
  isDisabled?: boolean
  error?: string
  onChange: (value: PhotoChange | undefined) => void
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [invalid, setInvalid] = useState<string>()
  const [preview, setPreview] = useState<{ file: File; url: string }>()
  const file = value?.type === "replace" ? value.file : undefined
  const message = invalid ?? error

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    let isCurrent = true
    queueMicrotask(() => {
      if (isCurrent) setPreview({ file, url })
    })
    return () => {
      isCurrent = false
      URL.revokeObjectURL(url)
    }
  }, [file])

  return (
    <fieldset
      disabled={isDisabled}
      className="min-w-0 rounded-2xl border border-card-border bg-card px-4 py-3"
    >
      <legend className="px-1 text-sm font-semibold">Profilová fotka</legend>
      <div className="flex flex-wrap items-center gap-4">
        <ProfileAvatar
          name={name}
          version={value?.type === "remove" ? null : version}
          preview={file && preview?.file === file ? preview.url : undefined}
          className="size-16"
        />
        <div className="min-w-0 flex-1 basis-40 space-y-2">
          <input
            ref={input}
            type="file"
            id={`${id}-file`}
            aria-label="Soubor profilové fotky"
            accept={IMAGE_ACCEPT}
            className="hidden"
            onChange={(event) => {
              const selected = event.currentTarget.files?.[0]
              event.currentTarget.value = ""
              if (!selected) return
              const problem =
                selected.size === 0 ? "Soubor s fotkou je prázdný." : imageProblem(selected)
              setInvalid(problem ?? undefined)
              if (!problem) onChange({ type: "replace", file: selected })
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              aria-describedby={`${id}-hint${message ? ` ${id}-error` : ""}`}
              className="min-h-11"
              onClick={() => input.current?.click()}
            >
              <Camera aria-hidden /> {version || file ? "Vyměnit fotku" : "Nahrát fotku"}
            </Button>
            {value ? (
              <Button
                type="button"
                variant="ghost"
                className="min-h-11"
                onClick={() => {
                  setInvalid(undefined)
                  onChange(undefined)
                }}
              >
                Vrátit fotku
              </Button>
            ) : version ? (
              <Button
                type="button"
                variant="ghost"
                className="min-h-11"
                onClick={() => {
                  setInvalid(undefined)
                  onChange({ type: "remove" })
                }}
              >
                <X aria-hidden /> Odebrat fotku
              </Button>
            ) : null}
          </div>
          {file ? <p className="text-sm break-all">{file.name}</p> : null}
          <p
            id={`${id}-hint`}
            className="flex items-start gap-1 text-xs text-muted-foreground"
          >
            <LockKeyhole
              aria-hidden
              className="size-4 shrink-0"
            />
            Fotku ve svém profilu uvidíš jen ty. JPEG, PNG nebo WebP do 5 MB.
          </p>
        </div>
      </div>
      {message ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-2 text-sm text-destructive"
        >
          {message}
        </p>
      ) : null}
    </fieldset>
  )
}
