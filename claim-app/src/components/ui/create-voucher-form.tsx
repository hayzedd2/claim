import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sparkles,
  Lock,
  Ticket,
  Calendar,
  Users,
  Banknote,
  CheckCircle2,
  Copy,
  AlertCircle,
  PencilSparklesIcon,
} from "lucide-react"
import { voucherSchema } from "@/schemas/schema"
import InputContainer from "./input-container"
import { getErrorMessage, suggestCodeBasedOnName } from "@/utils/helpers"

export function CreateVoucherForm() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [suggestedCode, setSuggestedCode]= useState<string | null>(null)

  const defaultExpiry = () => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().split("T")[0]
  }

  const tomorrowStr = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split("T")[0]
  }

  const form = useForm({
    defaultValues: {
      name: "",
      code: "",
      amount: 5000,
      max_redemptions: 10,
      expiry_date: defaultExpiry(),
      require_security: false,
      security_question: "",
      security_answer: "",
    },
    validators: {
      onChange: voucherSchema,
      onMount: voucherSchema,
      onBlur: voucherSchema,
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        const expTime = new Date(`${value.expiry_date}T23:59:59Z`).toISOString()

        const res = await api.createVoucher({
          name: value.name.trim(),
          code: value.code.trim().toUpperCase(),
          amount: Number(value.amount),
          max_redemptions: Number(value.max_redemptions),
          expiry_date: expTime,
          security_question: value.require_security
            ? value.security_question?.trim()
            : undefined,
          security_answer: value.require_security
            ? value.security_answer?.trim()
            : undefined,
        })
      } catch (err) {
        setServerError(
          err instanceof Error ? err.message : "Failed to create voucher"
        )
      }
    },
  })



  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="mt-6 max-w-lg space-y-6"
    >
      {serverError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Voucher Name */}
      <form.Field
        name="name"
        children={(field) => (
          <InputContainer
            errorMessage={getErrorMessage(field)}
            label="Voucher name"
            helpText="Only you can see this. It labels the voucher in your history"
          >
            <Input
              id={field.name}
              placeholder="e.g. TEAM LUNCH"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              aria-invalid={getErrorMessage(field) ? true : false}
            />
          </InputContainer>
        )}
      />

      {/* Code */}
      <form.Field
        name="code"
        children={(field) => (
          <InputContainer
            errorMessage={getErrorMessage(field)}
            label={
              <div className="flex items-center justify-between">
                <Label htmlFor={field.name}>Preferred code</Label>
                <button
                  disabled
                  className="m-0 flex cursor-pointer items-center gap-1 p-0 text-xs text-green-600 disabled:opacity-50"
                >
                  <PencilSparklesIcon size={12} /> Suggest
                </button>
              </div>
            }
            helpText="Unique code users will enter to claim."
          >
            <Input
              id={field.name}
              placeholder="e.g. CLAIM-LUNCH"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
              aria-invalid={getErrorMessage(field) ? true : false}
            />
          </InputContainer>
        )}
      />

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <Button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="w-full cursor-pointer py-5"
          >
            Continue
          </Button>
        )}
      />
    </form>
  )
}
