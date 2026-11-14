import { afterEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api-client"

import {
  publicProfileQueryOptions,
  publicProfileSchema,
  publicUserKeys,
  summaryLabel,
} from "./publicProfile"

const response = {
  id: "user",
  name: "Jana",
  interests: [],
  participantSummary: { average: null, count: 0 },
  organizerSummary: { average: null, count: 0 },
  eventSummary: { average: null, count: 0 },
  participantRatings: [],
  organizedEvents: [],
}
afterEach(() => vi.restoreAllMocks())
describe("public profile API", () => {
  it("keys each subject separately and requests an encoded ID without requiring a viewer", async () => {
    const json = vi.fn().mockResolvedValue(response)
    const get = vi
      .spyOn(api, "get")
      .mockReturnValue({ json } as unknown as ReturnType<typeof api.get>)
    const options = publicProfileQueryOptions("a/b")
    const run = options.queryFn as () => Promise<unknown>
    await expect(run()).resolves.toEqual(response)
    expect(get).toHaveBeenCalledWith("users/a%2Fb")
    expect(options.queryKey).toEqual(publicUserKeys.profile("a/b"))
    expect(publicUserKeys.profile("a")).not.toEqual(publicUserKeys.profile("b"))
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

  it("names an average with its count, and the lack of one", () => {
    expect(summaryLabel({ average: 4.5, count: 6 })).toBe("★ 4,5 (6 hodnocení)")
    expect(summaryLabel({ average: null, count: 0 })).toBe("zatím bez hodnocení")
  })
})
