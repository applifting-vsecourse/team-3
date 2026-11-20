import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ManagementSteps } from "./ManagementSteps"

const { toast } = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("sonner", () => ({ toast }))

describe("ManagementSteps (#371)", () => {
  it("numbers what comes next", () => {
    render(<ManagementSteps steps={["Sdílej odkaz.", "Kdo se přihlásí, objeví se tady."]} />)

    const steps = within(screen.getByRole("region", { name: "Jak to půjde dál" })).getAllByRole(
      "listitem",
    )
    expect(steps.map((step) => step.textContent)).toEqual([
      "1Sdílej odkaz.",
      "2Kdo se přihlásí, objeví se tady.",
    ])
  })

  it("offers the page's link to copy", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    render(
      <ManagementSteps
        steps={["Sdílej odkaz."]}
        link={{ path: "/akce/e1", title: "Deskovky", label: "Odkaz na akci" }}
      />,
    )

    expect(screen.getByLabelText("Odkaz na akci")).toHaveValue(`${window.location.origin}/akce/e1`)
    await userEvent.click(screen.getByRole("button", { name: "Kopírovat odkaz" }))
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/akce/e1`)
    expect(toast.success).toHaveBeenCalledWith("Odkaz je zkopírovaný.")
  })
})
