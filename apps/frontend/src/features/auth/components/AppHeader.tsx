import { Header } from "@/components/Header/Header"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
import { useSession } from "@/features/auth/hooks/useSession"

/** The header with what depends on the session: the user menu and „Moje akce“. */
export function AppHeader() {
  const { user } = useSession()
  return (
    <Header
      userMenu={<HeaderMenu />}
      isSignedIn={Boolean(user)}
    />
  )
}
