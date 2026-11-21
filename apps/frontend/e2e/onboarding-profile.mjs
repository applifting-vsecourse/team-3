import assert from "node:assert/strict"

// Passed to Runtime.evaluate. Make the requests in the preview page so its
// authenticated cookie, Origin, multipart encoding and image decoder are used.
async function multipartInBrowser(baseUrl, path, options) {
  const {
    settings,
    method = "POST",
    credentials = "include",
    photo,
    rawSettings,
    extraPart,
    copies = 1,
  } = options
  const body = new FormData()
  if (rawSettings !== undefined) body.append("profile", rawSettings)
  else if (settings !== undefined) body.append("profile", JSON.stringify(settings))
  if (extraPart) body.append("extra", "unexpected")
  if (photo) {
    let file
    if (photo.type === "too-big") {
      file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" })
    } else if (photo.type === "fake") {
      file = new File(["<svg><title>synthetic</title></svg>"], "renamed.png", { type: "image/png" })
    } else {
      const canvas = document.createElement("canvas")
      canvas.width = 98
      canvas.height = 71
      const context = canvas.getContext("2d")
      context.fillStyle = photo.color
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.fillStyle = "white"
      context.fillRect(10, 10, 16, 12)
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"))
      file = new File([blob], "portrait.png", { type: "image/png" })
    }
    for (let index = 0; index < copies; index++) body.append("image", file)
  }
  const response = await fetch(`${baseUrl}/${path}`, { method, credentials, body })
  return {
    status: response.status,
    body: await response.json().catch(() => null),
  }
}

function expectation(response, status, message) {
  assert.equal(response.status, status, `${message}: ${JSON.stringify(response.body)}`)
}

function sortedIds(ids) {
  return [...ids].sort((a, b) => a.localeCompare(b))
}

function checkPreferences(profile, settings, message) {
  assert.equal(profile.name, settings.name, message)
  assert.equal(profile.bio, settings.bio, message)
  assert.equal(profile.homeLocality?.id ?? null, settings.homeLocalityId, message)
  assert.deepEqual(
    sortedIds(profile.interests.map(({ id }) => id)),
    sortedIds(settings.interestIds),
    message,
  )
}

async function readProfile(request) {
  const profile = await request("me/profile")
  expectation(profile, 200, "The test account must have a readable profile")
  return profile.body
}

async function sessionMarker(request) {
  const session = await request("auth/get-session")
  expectation(session, 200, "The test account must retain its session")
  return session.body?.user?.onboardingCompletedAt
}

export async function exerciseOnboardingProfileContract({
  api,
  evaluate,
  register,
  request,
  verifyProfilePhoto,
}) {
  const onboard = "me/profile/onboarding/profile"
  const edit = "me/profile/details"
  const multipart = (path, options) =>
    evaluate(
      `(${multipartInBrowser.toString()})(${JSON.stringify(api)},${JSON.stringify(path)},${JSON.stringify(options)})`,
    )
  await register("profile-contract", "/akce")
  const initial = await readProfile(request)
  assert.equal(initial.photoVersion, null)
  assert.equal(await sessionMarker(request), null)

  const [cities, catalog] = await Promise.all([request("localities"), request("activities")])
  assert.equal(cities.status, 200)
  assert.equal(catalog.status, 200)
  const brno = cities.body.find(({ slug }) => slug === "brno")
  const plzen = cities.body.find(({ slug }) => slug === "plzen")
  assert(brno && plzen, "The scenario needs two seeded cities")
  const ids = catalog.body.flatMap(({ activities }) => activities.map(({ id }) => id))
  assert(ids.length >= 8, "The scenario needs eight distinct activities")
  const base = {
    name: "Jana Testovací",
    bio: "Na výlet si beru svačinu.",
    homeLocalityId: brno.id,
    interestIds: ids.slice(0, 4),
  }
  const alternative = {
    name: "Klára Testovací",
    bio: "Ráda bych objevila něco nového.",
    homeLocalityId: plzen.id,
    interestIds: ids.slice(4, 8),
  }
  const blue = { type: "valid", color: "#234b8a" }
  const orange = { type: "valid", color: "#b04b15" }

  async function assertPending() {
    const current = await readProfile(request)
    assert.equal(current.photoVersion, null, "A failed request wrote a photo")
    assert.equal(await sessionMarker(request), null, "A failed request completed onboarding")
    checkPreferences(
      current,
      {
        name: initial.name,
        bio: initial.bio,
        homeLocalityId: initial.homeLocality?.id ?? null,
        interestIds: initial.interests.map(({ id }) => id),
      },
      "A failed request wrote part of the profile",
    )
  }

  expectation(
    await multipart(onboard, {
      settings: base,
      photo: blue,
      credentials: "omit",
    }),
    401,
    "Anonymous upload is not allowed",
  )
  expectation(
    await multipart(edit, {
      method: "PATCH",
      settings: { name: base.name },
      photo: blue,
      credentials: "omit",
    }),
    401,
    "Anonymous profile edit is not allowed",
  )

  const invalidCases = [
    {
      label: "A malformed settings part",
      args: { rawSettings: "{", photo: blue },
      status: 400,
    },
    {
      label: "An omitted settings part",
      args: { photo: blue },
      status: 400,
    },
    {
      label: "A second form field",
      args: { settings: base, photo: blue, extraPart: true },
      status: 400,
    },
    {
      label: "A second image",
      args: { settings: base, photo: blue, copies: 2 },
      status: 400,
    },
    {
      label: "An oversized image",
      args: { settings: base, photo: { type: "too-big" } },
      status: 413,
    },
    {
      label: "A renamed SVG",
      args: { settings: base, photo: { type: "fake" } },
      status: 400,
      code: "INVALID_PHOTO",
    },
    {
      label: "An unknown city",
      args: { settings: { ...base, homeLocalityId: "synthetic-city-is-missing" }, photo: blue },
      status: 400,
      code: "UNKNOWN_LOCALITY",
    },
    {
      label: "An unknown interest",
      args: {
        settings: { ...base, interestIds: [...base.interestIds, "synthetic-interest-is-missing"] },
        photo: blue,
      },
      status: 400,
      code: "UNKNOWN_ACTIVITY",
    },
    {
      label: "Three entries with a duplicate",
      args: { settings: { ...base, interestIds: [ids[0], ids[1], ids[1]] }, photo: blue },
      status: 400,
    },
    {
      label: "Fewer than three interests",
      args: { settings: { ...base, interestIds: ids.slice(0, 2) }, photo: blue },
      status: 400,
    },
    {
      label: "A name the existing profile editor would reject",
      args: { settings: { ...base, name: "Jana #123" }, photo: blue },
      status: 400,
      code: "INVALID_NAME",
    },
  ]
  for (const { label, args, status, code } of invalidCases) {
    const refused = await multipart(onboard, args)
    expectation(refused, status, label)
    if (code) assert.equal(refused.body?.code, code, label)
    await assertPending()
  }

  // Separate simultaneous requests compete for the same first-completion
  // marker. The server may pick either, and all fields must belong to that one.
  const [left, right] = await Promise.all([
    multipart(onboard, { settings: base, photo: blue }),
    multipart(onboard, { settings: alternative, photo: orange }),
  ])
  expectation(left, 200, "First tab must finish")
  expectation(right, 200, "Second tab must observe completion")
  assert.deepEqual(left.body, right.body, "Concurrent clients saw different completion results")
  const firstSaved = await readProfile(request)
  const winner = firstSaved.name === base.name ? base : alternative
  checkPreferences(firstSaved, winner, "Completion mixed inputs from both tabs")
  assert.equal(left.body.displayName, firstSaved.name)
  assert.equal(await sessionMarker(request), left.body.onboardingCompletedAt)
  assert(firstSaved.photoVersion, "Completed profile is missing its photo")
  const originalPhoto = await verifyProfilePhoto(firstSaved.photoVersion)
  assert.equal(originalPhoto.status, 200)
  assert.equal(originalPhoto.mimeType, "image/webp")
  assert.equal(originalPhoto.cacheControl, "private, no-store")

  const retry = await multipart(onboard, {
    settings: { ...winner, name: "Opakovaný Pokus", bio: "Tento text se nemá přepsat." },
    photo: { type: "valid", color: "#9dbb14" },
  })
  expectation(retry, 200, "Retry must observe the persisted completion")
  assert.deepEqual(retry.body, left.body)
  const afterRetry = await readProfile(request)
  checkPreferences(afterRetry, winner, "Retry overwrote preferences")
  assert.equal(afterRetry.photoVersion, firstSaved.photoVersion, "Retry replaced the photo")

  expectation(
    await multipart(edit, {
      settings: { removePhoto: true, name: "Klára Testovací" },
      method: "PATCH",
      photo: blue,
    }),
    400,
    "Replacement and removal in one request must be refused",
  )
  const beforeEdit = await readProfile(request)
  assert.equal(beforeEdit.photoVersion, firstSaved.photoVersion)
  assert.equal(beforeEdit.name, winner.name)

  // A text-only legacy update must coexist with the new editor and leave
  // the user's photo intact. Clearing a photo then works even on a retry.
  expectation(
    await request("me/profile", {
      method: "PATCH",
      body: { bio: "Text upravený v běžném profilu." },
    }),
    200,
    "Legacy JSON edit should still work",
  )
  const legacy = await readProfile(request)
  assert.equal(legacy.photoVersion, firstSaved.photoVersion)
  assert.equal(legacy.bio, "Text upravený v běžném profilu.")

  const replacement = await multipart(edit, {
    method: "PATCH",
    settings: { name: "Petr Testovací", homeLocalityId: null, interestIds: [] },
    photo: orange,
  })
  expectation(replacement, 200, "The normal editor can replace a photo and clear optional fields")
  assert.equal(replacement.body.name, "Petr Testovací")
  assert.equal(replacement.body.bio, legacy.bio)
  assert.equal(replacement.body.homeLocality, null)
  assert.deepEqual(replacement.body.interests, [])
  assert(replacement.body.photoVersion)
  assert.notEqual(replacement.body.photoVersion, firstSaved.photoVersion)
  assert.equal((await verifyProfilePhoto(firstSaved.photoVersion)).status, 404)
  assert.equal((await verifyProfilePhoto("not-a-version")).status, 400)

  expectation(
    await multipart(edit, {
      method: "PATCH",
      settings: { removePhoto: true },
    }),
    200,
    "Photo-only removal is allowed",
  )
  expectation(
    await multipart(edit, {
      method: "PATCH",
      settings: { removePhoto: true },
    }),
    200,
    "Photo removal is repeatable",
  )
  assert.equal((await readProfile(request)).photoVersion, null)
  assert.equal((await verifyProfilePhoto(replacement.body.photoVersion)).status, 404)

  const kept = await multipart(edit, { method: "PATCH", settings: {}, photo: blue })
  expectation(kept, 200, "Photo-only replacement is allowed")
  assert.equal((await verifyProfilePhoto(kept.body.photoVersion)).status, 200)

  await register("profile-visitor", "/akce")
  const other = await readProfile(request)
  assert.notEqual(other.id, initial.id)
  assert.equal(other.photoVersion, null)
  assert.equal((await verifyProfilePhoto(kept.body.photoVersion)).status, 404)
  assert.equal((await verifyProfilePhoto(kept.body.photoVersion, "omit")).status, 401)
  const publicProfile = await request(`users/${encodeURIComponent(initial.id)}`)
  expectation(publicProfile, 200, "The public profile remains readable")
  assert(!JSON.stringify(publicProfile.body).includes(kept.body.photoVersion))
  assert(!JSON.stringify(publicProfile.body).includes(initial.email))
  assert(!JSON.stringify(publicProfile.body).includes(legacy.bio))
}
