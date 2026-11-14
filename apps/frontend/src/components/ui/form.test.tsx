import { zodResolver } from "@hookform/resolvers/zod"
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useRevealFormErrors,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const schema = z.object({
  first: z.string().min(1, "Vyplň první"),
  second: z.string().min(1, "Vyplň druhé"),
  place: z.string().min(1, "Vyber místo"),
})
type Values = z.infer<typeof schema>

/** Two text fields and a map-like region that can't carry `aria-invalid`. */
function TestForm({ serverError, place = "" }: { serverError?: string; place?: string }) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    shouldFocusError: false,
    defaultValues: { first: "", second: "", place },
  })
  const formRef = useRevealFormErrors(form, serverError)
  return (
    <Form {...form}>
      <form
        ref={formRef}
        noValidate
        onSubmit={form.handleSubmit(() => undefined)}
      >
        {serverError ? (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}
        {(["first", "second"] as const).map((name) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{name}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <FormField
          control={form.control}
          name="place"
          render={({ fieldState }) => (
            <div
              role="region"
              aria-label="mapa"
              data-invalid={Boolean(fieldState.error)}
            >
              {/* Leaflet makes its container focusable */}
              <div
                tabIndex={0}
                aria-label="mapa – posun"
              />
            </div>
          )}
        />
        <button type="submit">Odeslat</button>
      </form>
    </Form>
  )
}

const submit = () => userEvent.click(screen.getByRole("button", { name: "Odeslat" }))

/** Places an element on the page, as the layout would. */
const placeAt = (element: HTMLElement, rect: { top: number; left: number; width: number }) =>
  vi
    .spyOn(element, "getBoundingClientRect")
    .mockReturnValue(DOMRect.fromRect({ x: rect.left, y: rect.top, width: rect.width, height: 40 }))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("useRevealFormErrors", () => {
  it("after a failed submit scrolls the first invalid field to the middle and focuses it when the scroll ends", async () => {
    render(<TestForm />)
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView")
    const first = screen.getByLabelText("first")

    await submit()

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledOnce())
    expect(scrollIntoView.mock.contexts[0]).toBe(first)
    // the middle of the screen keeps it clear of the sticky header
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" })
    // focusing now would open the keyboard and iOS Safari would cut the scroll short
    expect(first).not.toHaveFocus()

    window.dispatchEvent(new Event("scrollend"))

    expect(first).toHaveFocus()
  })

  it("without a scrollend (Safari, nothing to scroll) focuses after 400 ms", async () => {
    render(<TestForm />)
    vi.spyOn(Element.prototype, "scrollIntoView")

    await submit()

    expect(screen.getByLabelText("first")).not.toHaveFocus()
    await waitFor(() => expect(screen.getByLabelText("first")).toHaveFocus())
  })

  it("a field tapped while the page scrolls keeps the focus", async () => {
    render(<TestForm />)
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView")

    await submit()
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledOnce())
    act(() => screen.getByLabelText("second").focus())
    window.dispatchEvent(new Event("scrollend"))

    expect(screen.getByLabelText("second")).toHaveFocus()
  })

  it("with reduced motion jumps to the field and focuses it at once", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    render(<TestForm />)
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView")

    await submit()

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledOnce())
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "center" })
    expect(screen.getByLabelText("first")).toHaveFocus()
  })

  it("on the phone the field higher on the screen wins, not the first in the DOM", async () => {
    render(<TestForm />)
    // one column: `order` put the second field above the first
    placeAt(screen.getByLabelText("first"), { top: 600, left: 16, width: 358 })
    placeAt(screen.getByLabelText("second"), { top: 300, left: 16, width: 358 })
    placeAt(screen.getByRole("region", { name: "mapa" }), { top: 900, left: 16, width: 358 })
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView")

    await submit()

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledOnce())
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByLabelText("second"))
  })

  it("on desktop the left column is read first, even where the right one starts higher", async () => {
    render(<TestForm />)
    placeAt(screen.getByLabelText("first"), { top: 500, left: 100, width: 500 })
    placeAt(screen.getByLabelText("second"), { top: 700, left: 100, width: 500 })
    placeAt(screen.getByRole("region", { name: "mapa" }), { top: 300, left: 650, width: 500 })
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView")

    await submit()

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledOnce())
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByLabelText("first"))
  })

  it("a field marked data-invalid (the map) is brought into view and passes the focus inside", async () => {
    render(<TestForm />)
    await userEvent.type(screen.getByLabelText("first"), "a")
    await userEvent.type(screen.getByLabelText("second"), "b")
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView")

    await submit()

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledOnce())
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByRole("region", { name: "mapa" }))
    window.dispatchEvent(new Event("scrollend"))
    expect(screen.getByLabelText("mapa – posun")).toHaveFocus()
  })

  it("a server error scrolls to the alert, which a screen reader announces; the focus stays", async () => {
    const { rerender } = render(<TestForm />)
    const button = screen.getByRole("button", { name: "Odeslat" })
    act(() => button.focus())
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView")

    rerender(<TestForm serverError="Server neodpovídá" />)

    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("Server neodpovídá")
    expect(scrollIntoView).toHaveBeenCalledOnce()
    expect(scrollIntoView.mock.contexts[0]).toBe(alert)
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" })
    window.dispatchEvent(new Event("scrollend"))
    expect(button).toHaveFocus()
  })

  it("a valid submit scrolls nowhere", async () => {
    render(<TestForm place="50.1,14.4" />)
    await userEvent.type(screen.getByLabelText("first"), "a")
    await userEvent.type(screen.getByLabelText("second"), "b")
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView")

    await submit()

    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
