import { Link } from "@tanstack/react-router"
import { LogOut } from "lucide-react"

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

import { useSession } from "@/features/auth/hooks/useSession"
import { useSignOut } from "@/features/auth/hooks/useSignOut"

export function HeaderMenu() {
  const { user } = useSession()
  const signOut = useSignOut()

  // On mobile, signing in lives in the bottom navigation.
  if (!user) {
    return (
      <div className="hidden items-center gap-2 md:flex">
        <Button
          asChild
          variant="ghost"
        >
          <Link to={ROUTES.login}>Přihlásit se</Link>
        </Button>
        <Button
          asChild
          variant="outline"
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
          size="icon"
          aria-label="Uživatelské menu"
          className="rounded-full"
        >
          <Avatar className="size-8">
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
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
