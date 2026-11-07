import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StatusBadge, type BadgeStatus } from "./StatusBadge"

describe("StatusBadge", () => {
  // Figma Status badge: the label from the data, the fill with its own edge
  it.each<[BadgeStatus, string, string[]]>([
    [{ kind: "missing", missing: 2 }, "Chybí 2", ["bg-primary", "border-primary-edge"]],
    [{ kind: "free", freeSpots: 1 }, "1 volné místo", ["bg-secondary", "border-tile-border"]],
    [{ kind: "free", freeSpots: 3 }, "3 volná místa", ["bg-secondary", "border-tile-border"]],
    [{ kind: "free", freeSpots: 8 }, "8 volných míst", ["bg-secondary", "border-tile-border"]],
    [{ kind: "full" }, "Plno", ["bg-badge-neutral", "border-control-border"]],
    [{ kind: "cancelled" }, "Zrušeno", ["bg-foreground", "text-background"]],
    [{ kind: "past" }, "Proběhlo", ["text-muted-foreground", "border-control-border"]],
    [{ kind: "going" }, "Jdu", ["bg-secondary", "border-tile-border"]],
    [{ kind: "pending" }, "Čeká na schválení", ["bg-badge-neutral", "border-control-border"]],
  ])("%o reads „%s“", (status, text, classes) => {
    render(<StatusBadge status={status} />)

    expect(screen.getByText(text)).toHaveClass("border", "h-6", ...classes)
  })

  it("only „Chybí“ is lime", () => {
    const { container } = render(
      <>
        <StatusBadge status={{ kind: "free", freeSpots: 2 }} />
        <StatusBadge status={{ kind: "full" }} />
        <StatusBadge status={{ kind: "going" }} />
        <StatusBadge status={{ kind: "pending" }} />
      </>,
    )

    expect(container.querySelectorAll(".bg-primary")).toHaveLength(0)
  })
})
