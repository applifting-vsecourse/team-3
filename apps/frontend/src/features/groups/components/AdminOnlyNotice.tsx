import { Link } from "@tanstack/react-router"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

/** Management and editing of a group are for its admins; the API answers 403 to anyone else as well. */
export function AdminOnlyNotice({ groupId }: { groupId: string }) {
  return (
    <Alert>
      <AlertTitle>Skupinu může spravovat jen její správce</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        <Button
          asChild
          variant="outline"
          size="sm"
        >
          <Link
            to="/skupiny/$groupId"
            params={{ groupId }}
          >
            Zpět na skupinu
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}
