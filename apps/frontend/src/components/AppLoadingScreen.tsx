import { Loader2 } from "lucide-react"

export function AppLoadingScreen() {
  return (
    <div className="grid flex-1 place-content-center">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  )
}
