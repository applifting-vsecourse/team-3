import { render, screen } from "@testing-library/react"
import { CalendarDays } from "lucide-react"
import { describe, expect, it } from "vitest"

import { expectValidDescriptionList } from "@/test/expectValidDescriptionList"

import { DetailRow } from "./DetailRow"

const renderRows = () =>
  render(
    <dl>
      <DetailRow
        icon={CalendarDays}
        label="Termín"
      >
        Pá 23. 10. · 17:30
      </DetailRow>
      <DetailRow
        icon={CalendarDays}
        label="Místo"
      >
        Kavárna Pražírna, Dělnická 12, Praha 8
      </DetailRow>
    </dl>,
  )

describe("DetailRow", () => {
  it("keeps the <dl> valid: each row is one <div> holding only its dt and dd", () => {
    const { container } = renderRows()

    expectValidDescriptionList(container.querySelector("dl")!)
  })

  it("pairs the label (dt) with its value (dd)", () => {
    renderRows()

    const term = screen.getByText("Termín")
    expect(term.tagName).toBe("DT")
    expect(term.nextElementSibling?.tagName).toBe("DD")
    expect(term.nextElementSibling).toHaveTextContent("Pá 23. 10. · 17:30")
  })

  it("keeps the icon out of the accessible name", () => {
    const { container } = renderRows()

    for (const icon of container.querySelectorAll("svg")) {
      expect(icon).toHaveAttribute("aria-hidden", "true")
    }
    expect(screen.getByText("Termín")).toHaveTextContent(/^Termín$/)
  })
})
