import { createContext, use, type ReactElement, type ReactNode } from "react"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
  type HistoryState,
} from "@tanstack/react-router"
import { render } from "@testing-library/react"

const UiContext = createContext<ReactNode>(null)

function TestUi() {
  return use(UiContext)
}

/**
 * Renders `ui` inside a router, for components with a `<Link>`. The router is
 * loaded before the first render, so queries work synchronously, and
 * `rerender` swaps the ui as with plain `render`. `previous` are the URLs
 * visited before `url`, for components that go back; `state` is the history
 * state `url` was opened with. `history` replaces the in-memory history, e.g.
 * with a browser history for behaviour only the real one has.
 */
export async function renderWithRouter(
  ui: ReactElement,
  {
    url = "/",
    previous = [] as string[],
    state = undefined as HistoryState | undefined,
    history = createMemoryHistory({ initialEntries: [...previous, url] }),
  } = {},
) {
  if (state) history.replace(url, state)
  const router = createRouter({
    routeTree: createRootRoute({ component: TestUi }),
    history,
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
