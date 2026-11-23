export type PhotoChange = { type: "replace"; file: File } | { type: "remove" }

/** The multipart body of PATCH me/profile/details and POST me/profile/onboarding/profile (#64). */
export function profileUpload(input: object, photo?: PhotoChange) {
  const body = new FormData()
  const settings = photo?.type === "remove" ? { ...input, removePhoto: true } : input
  body.set("profile", JSON.stringify(settings))
  if (photo?.type === "replace") body.set("image", photo.file, photo.file.name)
  return body
}
