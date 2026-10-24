import { createContext, use, type ReactElement, type ReactNode } from "react"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render } from "@testing-library/react"

const UiContext = createContext<ReactNode>(null)

function TestUi() {
  return use(UiContext)
}

/**
 * Renders `ui` inside a router, for components with a `<Link>`. The router is
 * loaded before the first render, so queries work synchronously, and
 * `rerender` swaps the ui as with plain `render`.
 */
export async function renderWithRouter(ui: ReactElement, { url = "/" } = {}) {
  const router = createRouter({
    routeTree: createRootRoute({ component: TestUi }),
    history: createMemoryHistory({ initialEntries: [url] }),
  })
  await router.load()
  return {
    router,
    ...render(ui, {
      wrapper: ({ children }) => (
        <UiContext value={children}>
          <RouterProvider router={router} />
        </UiContext>
      ),
    }),
  }
}
