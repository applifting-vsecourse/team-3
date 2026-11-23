import { useQuery } from "@tanstack/react-query"

import { PersonAvatar } from "@/components/PersonAvatar/PersonAvatar"

import { inviterQueryOptions } from "@/features/invites/api/invitesQueryOptions"

/**
 * „{jméno} tě zve na HobbyHub“ above the sign-up form (#406, brief §4): the „Máš místo“ block
 * (`secondary` + `tile-border`), not a card. Nothing while loading, and nothing for an
 * invalid code or a blocked or deleted inviter — the sign-up works the same.
 */
export function InviteBanner({ code }: { code: string | null }) {
  const inviter = useQuery({ ...inviterQueryOptions(code ?? ""), enabled: Boolean(code) })
  if (!code || !inviter.data) return null
  const { name, interests } = inviter.data
  return (
    <div className="flex gap-3 rounded-xl border border-tile-border bg-secondary p-4 text-secondary-foreground">
      <PersonAvatar
        name={name}
        className="size-10"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-base font-semibold break-words">{name} tě zve na HobbyHub</p>
        {interests.length ? <p className="text-sm">{interests.join(", ")}</p> : null}
        <p className="text-sm">Po registraci budete rovnou přátelé.</p>
      </div>
    </div>
  )
}
