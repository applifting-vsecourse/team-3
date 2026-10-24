import { expect } from "vitest"

/**
 * A `<dl>` as the HTML standard allows it: dt/dd groups as its direct
 * children, or one `<div>` per group that holds the group's dt and dd
 * elements and nothing else (no icon beside them, no nested wrapper).
 */
export function expectValidDescriptionList(dl: Element) {
  expect(dl.tagName).toBe("DL")
  const children = Array.from(dl.children)
  const tagsOf = (elements: Element[]) => elements.map((el) => `${el.tagName} `).join("")

  if (children.some((child) => child.tagName === "DIV")) {
    for (const div of children) {
      expect(div.tagName, "a <dl> mixes <div> groups with bare dt/dd").toBe("DIV")
      expect(tagsOf(Array.from(div.children))).toMatch(/^(?:DT )+(?:DD )+$/)
    }
  } else {
    expect(tagsOf(children)).toMatch(/^(?:(?:DT )+(?:DD )+)+$/)
  }
}
