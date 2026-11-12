import { Link } from "@tanstack/react-router"
import { LogOut, UserRound } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { initials } from "@/lib/initials"
import { cn } from "@/lib/utils"

import { useSession } from "@/features/auth/hooks/useSession"
import { useSignOut } from "@/features/auth/hooks/useSignOut"

export function HeaderMenu({
  isSignInOnMobile = false,
}: {
  /** The landing page keeps „Přihlásit se“ in the header on a phone too (Figma A-01). */
  isSignInOnMobile?: boolean
} = {}) {
  const { user } = useSession()
  const signOut = useSignOut()

  // On mobile, signing in lives in the bottom navigation (but on the landing page, A-01).
  // The header sits on the band (Figma Header/App desktop): cream ghost and outline buttons.
  if (!user) {
    return (
      <div className={cn("items-center gap-2 md:flex", isSignInOnMobile ? "flex" : "hidden")}>
        <Button
          asChild
          variant="ghost"
          className="h-11 px-4 text-on-hero max-md:px-2"
        >
          <Link to={ROUTES.login}>Přihlásit se</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-11 border-on-hero bg-transparent px-4 text-on-hero hover:bg-hero-pattern hover:text-on-hero max-md:hidden"
        >
          <Link to={ROUTES.signup}>Registrovat</Link>
        </Button>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          // the name says what the button shows (the initials) and whose menu it is: a label
          // without the visible text fails WCAG 2.5.3 Label in Name (#298)
          aria-label={`${initials(user.name)} – ${user.name}, uživatelské menu`}
          className="rounded-full"
        >
          <Avatar className="size-10 border border-on-hero-muted">
            <AvatarFallback className="bg-secondary text-sm font-semibold text-secondary-foreground">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48"
      >
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm leading-none font-medium">{user.name}</span>
            {/* accounts made since #37 have no username: B-010 doesn't ask for one */}
            {user.username ? (
              <span className="mt-1 text-xs text-muted-foreground">@{user.username}</span>
            ) : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* on a phone the profile is in the bottom navigation; on desktop only here (#178) */}
        <DropdownMenuItem asChild>
          <Link to={ROUTES.profile}>
            <UserRound className="size-4" />
            Můj profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => signOut.mutate()}
          disabled={signOut.isPending}
        >
          <LogOut className="size-4" />
          Odhlásit se
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
