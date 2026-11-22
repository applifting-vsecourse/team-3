import type { ReactNode } from "react"

import { Header } from "@/components/Header/Header"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
import { useSession } from "@/features/auth/hooks/useSession"
import { NotificationBell } from "@/features/notifications/components/NotificationBell"

/**
 * The header with what depends on the session: the bell (#86), the user menu and „Moje“. Put
 * together here, in `app/`: a feature doesn't import from another one.
 */
export function AppHeader({
  screenAction,
  isSignInOnMobile = false,
}: {
  screenAction?: ReactNode
  /** „Přihlásit se“ in the header on a phone too: the landing page (Figma A-01). */
  isSignInOnMobile?: boolean
} = {}) {
  const { user } = useSession()
  return (
    <Header
      userMenu={<HeaderMenu isSignInOnMobile={isSignInOnMobile} />}
      isSignedIn={Boolean(user)}
      screenAction={screenAction}
      notifications={user ? <NotificationBell viewerId={user.id} /> : null}
    />
  )
}
