import { useState } from "react"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { PhotoChange } from "@/features/profile/api/profileUpload"

import { ProfilePhotoField } from "./ProfilePhotoField"

const savedVersion = "f7896b3d-df87-40cc-9c68-70a696444c51"
const secondVersion = "055c0d4f-bba0-4e37-a51b-441ff248b668"
const owner = "Jana Nová"
const first = new File(["synthetic image"], "portrait.png", { type: "image/png" })
const second = new File(["second synthetic image"], "portrait new.webp", { type: "image/webp" })

function PhotoFixture({
  version,
  error,
  isDisabled,
  notify,
}: {
  version?: string
  error?: string
  isDisabled?: boolean
  notify?: (value?: PhotoChange) => void
}) {
  const [value, setValue] = useState<PhotoChange>()
  return (
    <ProfilePhotoField
      name={owner}
      version={version}
      error={error}
      isDisabled={isDisabled}
      value={value}
      onChange={(change) => {
        notify?.(change)
        setValue(change)
      }}
    />
  )
}

function renderPhoto(props: Parameters<typeof PhotoFixture>[0] = {}) {
  const view = render(<PhotoFixture {...props} />)
  const group = screen.getByRole("group", { name: "Profilová fotka" })
  const Input = within(group).getByLabelText<HTMLInputElement>("Soubor profilové fotky", {
    selector: "input",
  })
  const user = userEvent.setup({ applyAccept: false })
  return {
    ...view,
    user,
    upload: (file: File) => user.upload(Input, file),
    getPreview: () => group.querySelector("img"),
    getGroup: () => within(group),
  }
}

describe("owner-only profile photo field", () => {
  const createUrl = vi.fn<(file: Blob) => string>()
  const freeUrl = vi.fn<(url: string) => void>()
  beforeEach(() => {
    createUrl.mockReset()
    freeUrl.mockReset()
    createUrl
      .mockReturnValueOnce("blob://portrait-1")
      .mockReturnValueOnce("blob://portrait-2")
      .mockReturnValue("blob://portrait-retry")
    vi.stubGlobal(
      "URL",
      Object.assign(class extends URL {}, {
        createObjectURL: createUrl,
        revokeObjectURL: freeUrl,
      }),
    )
  })
  afterEach(() => vi.unstubAllGlobals())

  it("starts with initials and explains both privacy and file formats", () => {
    const view = renderPhoto()
    expect(view.getPreview()).toBeNull()
    expect(view.getGroup().getByText("JN")).toBeVisible()
    expect(
      view.getGroup().getByRole("button", { name: "Nahrát fotku" }),
    ).toHaveAccessibleDescription(/uvidíš jen ty.*JPEG, PNG nebo WebP do 5 MB/i)
  })

  it("loads persisted photos using credentials and falls back if an image stops loading", () => {
    const view = renderPhoto({ version: savedVersion })
    const photo = view.getPreview()
    if (!photo) throw new Error("Expected a persisted photo")
    expect(photo).toHaveAttribute("crossorigin", "use-credentials")
    expect(photo.getAttribute("src")).toMatch(new RegExp(`/me/profile/photo/${savedVersion}$`))
    fireEvent.error(photo)
    expect(view.getPreview()).toBeNull()
    expect(view.getGroup().getByText("JN")).toBeVisible()

    view.rerender(<PhotoFixture version={secondVersion} />)
    expect(view.getPreview()?.getAttribute("src")).toMatch(new RegExp(`${secondVersion}$`))
  })

  it("releases old previews on replacement, restoration and unmount", async () => {
    const notify = vi.fn<(value?: PhotoChange) => void>()
    const view = renderPhoto({ version: savedVersion, notify })
    await view.upload(first)
    await waitFor(() => expect(view.getPreview()).toHaveAttribute("src", "blob://portrait-1"))
    expect(view.getPreview()).not.toHaveAttribute("crossorigin")
    expect(notify).toHaveBeenLastCalledWith({ type: "replace", file: first })

    await view.upload(second)
    await waitFor(() => expect(view.getPreview()).toHaveAttribute("src", "blob://portrait-2"))
    expect(freeUrl).toHaveBeenCalledExactlyOnceWith("blob://portrait-1")
    expect(view.getGroup().getByText(second.name)).toBeVisible()

    await view.user.click(view.getGroup().getByRole("button", { name: "Vrátit fotku" }))
    expect(notify).toHaveBeenLastCalledWith(undefined)
    expect(view.getPreview()?.getAttribute("src")).toMatch(new RegExp(`${savedVersion}$`))
    expect(freeUrl).toHaveBeenCalledWith("blob://portrait-2")

    await view.upload(first)
    await waitFor(() => expect(view.getPreview()).toHaveAttribute("src", "blob://portrait-retry"))
    view.unmount()
    expect(freeUrl).toHaveBeenLastCalledWith("blob://portrait-retry")
  })

  it.each([
    [
      "a renamed HTML page",
      new File(["<html>"], "copy.html", { type: "text/html" }),
      /formátu JPEG/,
    ],
    ["an empty file", new File([], "empty.png", { type: "image/png" }), /je prázdný/],
    [
      "a file over 5 MB",
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.jpg", {
        type: "image/jpeg",
      }),
      /nejvýš 5 MB/,
    ],
  ])("keeps the previous preview when choosing %s", async (_, file, message) => {
    const notify = vi.fn<(value?: PhotoChange) => void>()
    const view = renderPhoto({ notify })
    await view.upload(first)
    await waitFor(() => expect(view.getPreview()).toHaveAttribute("src", "blob://portrait-1"))
    await view.upload(file)
    expect(view.getGroup().getByRole("alert")).toHaveTextContent(message)
    expect(view.getPreview()).toHaveAttribute("src", "blob://portrait-1")
    expect(notify).toHaveBeenCalledTimes(1)
    expect(createUrl).toHaveBeenCalledTimes(1)
  })

  it("keeps removal local until saved and can restore the uploaded photo", async () => {
    const notify = vi.fn<(value?: PhotoChange) => void>()
    const view = renderPhoto({ version: savedVersion, notify })
    await view.user.click(view.getGroup().getByRole("button", { name: "Odebrat fotku" }))
    expect(notify).toHaveBeenLastCalledWith({ type: "remove" })
    expect(view.getPreview()).toBeNull()
    await view.user.click(view.getGroup().getByRole("button", { name: "Vrátit fotku" }))
    expect(notify).toHaveBeenLastCalledWith(undefined)
    expect(view.getPreview()?.getAttribute("src")).toMatch(new RegExp(`${savedVersion}$`))
  })

  it("disables changes while saving and connects a rejected upload to its control", () => {
    const { getGroup } = renderPhoto({
      version: savedVersion,
      error: "Tahle fotka nejde načíst.",
      isDisabled: true,
    })
    const choose = getGroup().getByRole("button", { name: "Vyměnit fotku" })
    expect(choose).toBeDisabled()
    expect(choose).toHaveAccessibleDescription(/Tahle fotka nejde načíst/)
    expect(getGroup().getByRole("button", { name: "Odebrat fotku" })).toBeDisabled()
  })
})
