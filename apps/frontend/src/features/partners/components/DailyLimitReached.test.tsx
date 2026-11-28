import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { isPremiumEnabled } from "@/config/env"

import { DailyLimitReached } from "@/features/partners/components/DailyLimitReached"

describe("DailyLimitReached (#473)", () => {
  it("the paid plan is off unless VITE_PREMIUM_ENABLED is true", () => {
    expect(isPremiumEnabled).toBe(false)
  })

  it("without the paid plan: when it comes back, and no word of plans", () => {
    render(<DailyLimitReached id="limit" />)

    expect(screen.getByText(/^Na dnešek máš přidáno dost/)).toHaveTextContent(
      "Na dnešek máš přidáno dost. Další lidi můžeš přidat zítra od 0:00.",
    )
    expect(screen.queryByText(/tarif|Plus/i)).not.toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("with the paid plan: the higher limit and a quiet link to the plans", () => {
    render(
      <DailyLimitReached
        id="limit"
        isPremiumEnabled
      />,
    )

    expect(document.getElementById("limit")).toHaveTextContent(
      "Na dnešek máš přidáno dost. Další lidi můžeš přidat zítra od 0:00. S tarifem Plus jich přidáš až 50 denně.",
    )
    const link = screen.getByRole("link", { name: "Zobrazit tarify" })
    expect(link).toHaveAttribute("href", "/tarify")
    expect(link).toHaveAttribute("data-variant", "link")
  })
})
