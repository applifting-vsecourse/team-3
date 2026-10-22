import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"

// Brand mark from Figma (Logo/Mark): a group of four with one spot still free.
function LogoMark() {
  return (
    <svg
      viewBox="0 0 28 28"
      className="size-7 shrink-0"
      aria-hidden="true"
    >
      <g
        className="fill-primary stroke-foreground"
        strokeWidth="1.5"
      >
        <circle
          cx="7"
          cy="7"
          r="4.25"
        />
        <circle
          cx="21"
          cy="7"
          r="4.25"
        />
        <circle
          cx="7"
          cy="21"
          r="4.25"
        />
      </g>
      <circle
        cx="21"
        cy="21"
        r="3.75"
        className="fill-none stroke-foreground"
        strokeWidth="1.5"
        strokeDasharray="1.5 1.5"
      />
    </svg>
  )
}

export function HeaderLogo() {
  return (
    <Link
      to={ROUTES.home}
      className="flex items-center gap-2 font-heading text-xl font-bold tracking-tight"
    >
      <LogoMark />
      HobbyHub
    </Link>
  )
}
