import { afterEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api-client"

import { publicProfileQueryOptions, publicProfileSchema, publicUserKeys } from "./publicProfile"

const response = {
  id: "user",
  name: "Jana",
  interests: [],
  participantSummary: { average: null, count: 0 },
  organizerSummary: { average: null, count: 0 },
  eventSummary: { average: null, count: 0 },
  participantRatings: [],
  organizedEvents: [],
  bio: null,
  photoKey: null,
  pastEvents: null,
  friendship: null,
  upcomingEvents: null,
}
afterEach(() => vi.restoreAllMocks())
describe("public profile API", () => {
  it("keys each subject and viewer separately and requests an encoded ID without requiring a viewer", async () => {
    const json = vi.fn().mockResolvedValue(response)
    const get = vi
      .spyOn(api, "get")
      .mockReturnValue({ json } as unknown as ReturnType<typeof api.get>)
    const options = publicProfileQueryOptions("a/b", null)
    const run = options.queryFn as () => Promise<unknown>
    await expect(run()).resolves.toEqual(response)
    expect(get).toHaveBeenCalledWith("users/a%2Fb")
    expect(options.queryKey).toEqual(publicUserKeys.profile("a/b", null))
    expect(publicUserKeys.profile("a", null)).not.toEqual(publicUserKeys.profile("b", null))
    // #307: the friendship and Kam jde are the viewer's, so nobody else gets them from the cache
    expect(publicUserKeys.profile("a", "jakub")).not.toEqual(publicUserKeys.profile("a", "petra"))
    expect(publicUserKeys.profile("a", "jakub")).not.toEqual(publicUserKeys.profile("a", null))
    // a change of the friendship refreshes every viewer's copy of the person
    expect(publicUserKeys.profile("a", "jakub").slice(0, 2)).toEqual(publicUserKeys.person("a"))
    expect(options.retry).toBe(false)
  })
  it("strips unexpected account fields", () => {
    const profile = publicProfileSchema.parse({
      ...response,
      email: "private@example.com",
      participations: ["private"],
      groupMemberships: ["group"],
      participantRatings: [
        {
          id: "rating",
          stars: 4,
          comment: "Díky",
          createdAt: "2026-11-01T12:00:00Z",
          event: { id: "public-event", title: "Volejbal" },
          author: null,
        },
      ],
    })
    expect(profile).not.toHaveProperty("email")
    expect(profile).not.toHaveProperty("participations")
    expect(profile).not.toHaveProperty("groupMemberships")
    expect(profile.participantRatings[0]!.createdAt).toBeInstanceOf(Date)
  })
  it.each([-1, 1.5])("rejects an invalid approved count %s", (approvedCount) => {
    const data = {
      ...response,
      organizedEvents: [
        {
          id: "past",
          title: "Běh",
          startsAt: "2026-11-01T12:00:00Z",
          endsAt: null,
          localityName: "Praha",
          activityName: "Běh",
          address: "Stromovka, Praha 7",
          locality: { id: "praha", slug: "praha", name: "Praha" },
          activity: {
            id: "beh",
            slug: "beh",
            name: "Běh",
            category: { id: "sport", slug: "sport", name: "Sport", icon: "ball" },
          },
          approvedCount,
          missingToMin: 0,
          rating: { average: null, count: 0 },
        },
      ],
    }
    expect(publicProfileSchema.safeParse(data).success).toBe(false)
    expect(
      publicProfileSchema.parse({
        ...data,
        organizedEvents: [{ ...data.organizedEvents[0], approvedCount: 0 }],
      }).organizedEvents[0]?.approvedCount,
    ).toBe(0)
  })
})
