import { env } from "@/config/env"

export type PhotoChange = { type: "replace"; file: File } | { type: "remove" }

export function profileUpload(input: object, photo?: PhotoChange) {
  const body = new FormData()
  const settings = photo?.type === "remove" ? { ...input, removePhoto: true } : input
  body.set("profile", JSON.stringify(settings))
  if (photo?.type === "replace") body.set("image", photo.file, photo.file.name)
  return body
}

export const profilePhotoUrl = (version: string) =>
  `${env.VITE_API_URL.replace(/\/$/, "")}/me/profile/photo/${encodeURIComponent(version)}`
