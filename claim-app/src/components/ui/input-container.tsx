import { cn } from "@/lib/utils"
import { Label } from "./label"
import { CircleAlertIcon, OctagonAlertIcon } from "lucide-react"

const InputContainer = ({
  label,
  helpText,
  children,
  className,
  errorMessage,
}: {
  children: React.ReactNode
  className?: string
  helpText?: string
  label?: string | React.ReactNode
  errorMessage?: string
}) => {
  return (
    <div className={cn(className, "flex w-full flex-col gap-2")}>
      {typeof label == "string" ?  <Label>{label}</Label> : label}
      {children}
      {errorMessage && (
        <div className="flex items-center gap-1 rounded-sm bg-red-100 p-2 text-xs">
          <OctagonAlertIcon color={"#BA110B"} size={12} className="shrink-0" />
          <p className={`text-destructive`}>{errorMessage}</p>
        </div>
      )}
      {helpText && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CircleAlertIcon size={12} />
          <p>{helpText}</p>
        </div>
      )}
    </div>
  )
}

export default InputContainer
