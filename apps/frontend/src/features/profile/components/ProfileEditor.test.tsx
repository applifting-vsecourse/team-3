import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { HTTPError } from "@/lib/api-client"
import type { ActivityCategory, Locality } from "@/lib/catalog/catalogSchemas"

import type { ProfileInput } from "@/features/profile/api/profileSchemas"

import { ProfileEditor, type ProfileDraft, type ProfileEditorProps } from "./ProfileEditor"

vi.mock("@/components/CatalogCombobox/LocalityCombobox", () => ({
  LocalityCombobox: ({
    localities,
    value,
    onChange,
    ...props
  }: {
    localities: Locality[]
    value: string
    onChange: (id: string) => void
  }) => (
    <select
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      {...props}
    >
      <option value="">Bez lokality</option>
      {localities.map(({ id, name }) => (
        <option
          key={id}
          value={id}
        >
          {name}
        </option>
      ))}
    </select>
  ),
}))
vi.mock("@/components/CatalogCombobox/ActivityCombobox", () => ({
  ActivityCombobox: ({
    categories,
    disabled: isDisabled,
    onChange,
    ...props
  }: {
    categories: ActivityCategory[]
    disabled?: boolean
    onChange: (id: string) => void
  }) => (
    <select
      {...props}
      disabled={isDisabled}
      value=""
      onChange={(event) => onChange(event.currentTarget.value)}
    >
      <option value="">Vyber aktivitu</option>
      {categories
        .flatMap(({ activities }) => activities)
        .map(({ id, name }) => (
          <option
            key={id}
            value={id}
          >
            {name}
          </option>
        ))}
    </select>
  ),
}))

const categories: ActivityCategory[] = [
  {
    id: "sports",
    slug: "tymove-sporty",
    name: "Sporty",
    icon: "ball",
    activities: [
      { id: "volleyball", slug: "volejbal", name: "Volejbal", keywords: [] },
      { id: "running", slug: "beh", name: "Běh", keywords: [] },
      { id: "hiking", slug: "turistika", name: "Turistika", keywords: [] },
      { id: "cycling", slug: "cyklistika", name: "Cyklistika", keywords: [] },
      { id: "tennis", slug: "tenis", name: "Tenis", keywords: [] },
    ],
  },
]

const brno: Locality = {
  id: "brno",
  slug: "brno",
  name: "Brno",
  parentId: null,
  lat: 49.195,
  lng: 16.607,
}
const plzen: Locality = {
  id: "plzen",
  slug: "plzen",
  name: "Plzeň",
  parentId: null,
  lat: 49.75,
  lng: 13.378,
}

const initial: ProfileInput = {
  name: "Jana Nová",
  bio: "",
  homeLocalityId: brno.id,
  interestIds: ["volleyball", "running", "hiking"],
}

function defaults(overrides: Partial<ProfileEditorProps> = {}): ProfileEditorProps {
  return {
    initial,
    categories,
    localities: [brno, plzen],
    onSave: vi.fn<ProfileEditorProps["onSave"]>().mockResolvedValue(undefined),
    ...overrides,
  }
}

function optional(overrides: Partial<NonNullable<ProfileEditorProps["onboarding"]>> = {}) {
  return {
    minimumInterests: 3,
    onBack: vi.fn<(draft: ProfileDraft) => void>(),
    onSkip: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    renderBioSuggestion: ({
      name,
      bio,
      localityName,
      activityNames,
      apply,
    }: Parameters<NonNullable<ProfileEditorProps["onboarding"]>["renderBioSuggestion"]>[0]) => (
      <button
        type="button"
        onClick={() =>
          apply(`Jsem ${name} a baví mě ${activityNames.join(", ")}. (${localityName ?? ""})`)
        }
      >
        {bio ? "Další bio" : "Návrh bio"}
      </button>
    ),
    ...overrides,
  }
}

function controls() {
  return {
    name: screen.getByRole("textbox", { name: "Jméno" }),
    bio: screen.getByRole("textbox", { name: "O mně" }),
    place: screen.getByRole("combobox", { name: "Domovská lokalita" }),
    interests: screen.getByRole("combobox", { name: "Zájmy" }),
    selected: screen.getByRole("list", { name: "Vybrané zájmy" }),
  }
}

function invalidPhoto() {
  const error = new HTTPError(
    new Response(null, { status: 400 }),
    new Request("http://localhost:4050/api/me/profile/details", { method: "PATCH" }),
    {} as never,
  )
  error.message = "Zkus jiný soubor."
  error.data = { code: "INVALID_PHOTO", message: error.message }
  return error
}

describe("the common profile editor", () => {
  it("edits preferences, name and bio together during the optional step", async () => {
    const props = defaults({ onboarding: optional() })
    render(<ProfileEditor {...props} />)
    const user = userEvent.setup()
    const { name, bio, place, interests, selected } = controls()
    expect(name).toHaveValue(initial.name)
    expect(place).toHaveValue(brno.id)
    expect(within(selected).getAllByRole("listitem")).toHaveLength(3)
    expect(bio).toHaveValue("")

    await user.clear(name)
    await user.type(name, "Eliška Nová")
    await user.selectOptions(place, plzen.id)
    await user.selectOptions(interests, "cycling")
    await user.click(screen.getByRole("button", { name: "Návrh bio" }))
    expect(bio).toHaveValue(
      "Jsem Eliška Nová a baví mě Volejbal, Běh, Turistika, Cyklistika. (Plzeň)",
    )

    await user.click(screen.getByRole("button", { name: "Uložit a ukázat akce" }))
    expect(props.onSave).toHaveBeenCalledExactlyOnceWith(
      {
        name: "Eliška Nová",
        bio: "Jsem Eliška Nová a baví mě Volejbal, Běh, Turistika, Cyklistika. (Plzeň)",
        homeLocalityId: plzen.id,
        interestIds: [...initial.interestIds, "cycling"],
      },
      undefined,
    )
  })

  it("allows a generated legacy name to be carried over unchanged", async () => {
    const props = defaults({
      initial: { ...initial, name: "vylety123" },
      onboarding: optional(),
    })
    render(<ProfileEditor {...props} />)
    await userEvent.setup().click(screen.getByRole("button", { name: "Uložit a ukázat akce" }))
    expect(props.onSave).toHaveBeenCalledExactlyOnceWith(props.initial, undefined)
  })

  it("validates a changed name with the shared name policy", async () => {
    const props = defaults({ onboarding: optional() })
    render(<ProfileEditor {...props} />)
    const user = userEvent.setup()
    const { name } = controls()
    await user.clear(name)
    await user.type(name, "Test 42")
    await user.click(screen.getByRole("button", { name: "Uložit a ukázat akce" }))
    expect(await screen.findByText(/do jména nepatří/i)).toBeVisible()
    expect(props.onSave).not.toHaveBeenCalled()
  })

  it("keeps locality and three interests required until onboarding is completed", async () => {
    const props = defaults({ onboarding: optional() })
    render(<ProfileEditor {...props} />)
    const user = userEvent.setup()
    const { place, interests } = controls()
    await user.selectOptions(place, "")
    await user.click(screen.getByRole("button", { name: "Odebrat zájem Turistika" }))
    const save = screen.getByRole("button", { name: "Uložit a ukázat akce" })
    await user.click(save)
    expect(await screen.findByText("Vyber domovskou lokalitu ze seznamu.")).toBeVisible()
    expect(await screen.findByText("Vyber alespoň 3 zájmy.")).toBeVisible()
    expect(props.onSave).not.toHaveBeenCalled()

    await user.selectOptions(place, plzen.id)
    await user.selectOptions(interests, "cycling")
    await user.click(save)
    expect(props.onSave).toHaveBeenCalledExactlyOnceWith(
      { ...initial, homeLocalityId: plzen.id, interestIds: ["volleyball", "running", "cycling"] },
      undefined,
    )
  })

  it("uses the current chooser preferences when returning to a draft that only edited bio", async () => {
    const onBack = vi.fn<(draft: ProfileDraft) => void>()
    const props = defaults({ onboarding: optional({ onBack }) })
    const view = render(<ProfileEditor {...props} />)
    const user = userEvent.setup()
    await user.type(controls().bio, "Hledám partu na výlet.")
    await user.click(screen.getByRole("button", { name: "Zpět" }))
    const draft = onBack.mock.lastCall?.[0]
    if (!draft) throw new Error("Expected a profile draft")
    expect(draft.settings).toEqual({ bio: "Hledám partu na výlet." })
    view.unmount()

    render(
      <ProfileEditor
        {...props}
        draft={draft}
        initial={{
          ...initial,
          homeLocalityId: plzen.id,
          interestIds: ["tennis", "running", "hiking"],
        }}
      />,
    )
    expect(controls().place).toHaveValue(plzen.id)
    expect(controls().bio).toHaveValue("Hledám partu na výlet.")
    expect(within(controls().selected).getByText("Tenis")).toBeVisible()
    expect(within(controls().selected).queryByText("Volejbal")).toBeNull()
  })

  it("restores the edited locality, interests and name when drafted in the same editor", async () => {
    const onBack = vi.fn<(draft: ProfileDraft) => void>()
    const props = defaults({ onboarding: optional({ onBack }) })
    const view = render(<ProfileEditor {...props} />)
    const user = userEvent.setup()
    const { name, place, interests } = controls()
    await user.clear(name)
    await user.type(name, "Lucie Horská")
    await user.selectOptions(place, plzen.id)
    await user.selectOptions(interests, "tennis")
    await user.click(screen.getByRole("button", { name: "Zpět" }))
    const draft = onBack.mock.lastCall?.[0]
    if (!draft) throw new Error("Expected a profile draft")
    expect(draft.settings).toMatchObject({
      name: "Lucie Horská",
      homeLocalityId: plzen.id,
      interestIds: [...initial.interestIds, "tennis"],
    })
    view.unmount()
    render(
      <ProfileEditor
        {...props}
        draft={draft}
      />,
    )
    expect(controls().name).toHaveValue("Lucie Horská")
    expect(controls().place).toHaveValue(plzen.id)
    expect(within(controls().selected).getByText("Tenis")).toBeVisible()
  })

  it("skips the editor without submitting its unsaved data", async () => {
    const onSkip = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    const props = defaults({ onboarding: optional({ onSkip }) })
    render(<ProfileEditor {...props} />)
    const user = userEvent.setup()
    await user.type(controls().bio, "Rozpracováno")
    await user.selectOptions(controls().place, plzen.id)
    await user.click(screen.getByRole("button", { name: "Teď ne" }))
    expect(onSkip).toHaveBeenCalledTimes(1)
    expect(props.onSave).not.toHaveBeenCalled()
  })

  it("keeps changes after an unsuccessful skip and enables the actions again", async () => {
    const onSkip = vi.fn<() => Promise<void>>().mockRejectedValue(new Error("Zkus to znovu."))
    const props = defaults({ onboarding: optional({ onSkip }) })
    render(<ProfileEditor {...props} />)
    const user = userEvent.setup()
    await user.type(controls().bio, "Rozpracováno")
    await user.click(screen.getByRole("button", { name: "Teď ne" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Zkus to znovu.")
    expect(controls().bio).toHaveValue("Rozpracováno")
    expect(screen.getByRole("button", { name: "Uložit a ukázat akce" })).toBeEnabled()
  })

  it("ignores additional submissions until a pending save resolves", async () => {
    let release: () => void = () => undefined
    const slow = new Promise<void>((resolve) => {
      release = resolve
    })
    const onSave = vi.fn<ProfileEditorProps["onSave"]>().mockReturnValue(slow)
    const props = defaults({ onSave, onboarding: optional() })
    render(<ProfileEditor {...props} />)
    const form = screen.getByRole("button", { name: "Uložit a ukázat akce" }).closest("form")
    if (!form) throw new Error("Missing profile form")
    fireEvent.submit(form)
    fireEvent.submit(form)
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(controls().name).toBeDisabled()
    expect(screen.getByRole("button", { name: "Teď ne" })).toBeDisabled()
    fireEvent.submit(form)
    expect(onSave).toHaveBeenCalledTimes(1)
    await act(async () => {
      release()
      await slow
    })
    expect(screen.getByRole("button", { name: "Uložit a ukázat akce" })).toBeEnabled()
  })

  it("keeps other fields when the backend refuses a profile photo", async () => {
    const onSave = vi.fn<ProfileEditorProps["onSave"]>().mockRejectedValue(invalidPhoto())
    render(<ProfileEditor {...defaults({ onSave, onboarding: optional() })} />)
    const user = userEvent.setup()
    await user.type(controls().bio, "Ahoj, mám ráda běh.")
    await user.click(screen.getByRole("button", { name: "Uložit a ukázat akce" }))
    const photoGroup = screen.getByRole("group", { name: "Profilová fotka" })
    expect(await within(photoGroup).findByRole("alert")).toHaveTextContent("Zkus jiný soubor.")
    expect(controls().bio).toHaveValue("Ahoj, mám ráda běh.")
    expect(screen.getByRole("button", { name: "Uložit a ukázat akce" })).toBeEnabled()
  })

  it("reuses the same fields in normal editing with nullable choices and dirty-only bio", async () => {
    const props = defaults({ initial: { ...initial, bio: "Již uložený text." } })
    render(<ProfileEditor {...props} />)
    const user = userEvent.setup()
    expect(screen.queryByRole("button", { name: "Teď ne" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Návrh bio" })).toBeNull()
    expect(controls().bio).toHaveValue("Již uložený text.")
    await user.click(screen.getByRole("button", { name: "Vymazat lokalitu" }))
    await user.click(screen.getByRole("button", { name: "Uložit změny" }))
    expect(props.onSave).toHaveBeenCalledExactlyOnceWith(
      { name: initial.name, homeLocalityId: null, interestIds: initial.interestIds },
      undefined,
    )
  })
})
