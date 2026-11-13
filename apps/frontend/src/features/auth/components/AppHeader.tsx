import type { ReactNode } from "react"

import { Header } from "@/components/Header/Header"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
import { useSession } from "@/features/auth/hooks/useSession"

/** The header with what depends on the session: the user menu and „Moje“. */
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
    />
  )
}
