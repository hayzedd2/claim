import { cn } from "@/lib/utils"
import { Label } from "./label"
import { CircleAlertIcon, OctagonAlertIcon } from "lucide-react"
import { ErrorContainer } from "./error-container"

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
      {typeof label == "string" ? <Label>{label}</Label> : label}
      {children}
      {errorMessage && (
      <ErrorContainer error={errorMessage}/>
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
