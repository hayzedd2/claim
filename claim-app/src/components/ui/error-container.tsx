import { OctagonAlertIcon } from "lucide-react"

export const ErrorContainer = ({ error }: { error: string }) => {
  return (
    <div className="flex items-center gap-1 rounded-sm border border-destructive/20 bg-destructive/10 p-2 text-xs">
      <OctagonAlertIcon color={"#BA110B"} size={12} className="shrink-0" />
      <p className={`text-destructive`}>{error}</p>
    </div>
  )
}
